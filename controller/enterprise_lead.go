package controller

import (
	"errors"
	"net/mail"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

// The contact form is open to anonymous visitors, so one address may only
// create a handful of leads per hour.
const (
	enterpriseLeadWindowSeconds = 3600
	enterpriseLeadWindowLimit   = 3
)

const (
	enterpriseLeadMaxCompany     = 128
	enterpriseLeadMaxContactName = 64
	enterpriseLeadMaxEmail       = 254
	enterpriseLeadMaxTokens      = 64
	enterpriseLeadMaxRequirement = 2000
	enterpriseLeadMaxRemark      = 2000
)

type enterpriseLeadPayload struct {
	Company       string `json:"company"`
	ContactName   string `json:"contact_name"`
	Email         string `json:"email"`
	MonthlyTokens string `json:"monthly_tokens"`
	Requirement   string `json:"requirement"`
}

type enterpriseLeadUpdatePayload struct {
	Status *int    `json:"status"`
	Remark *string `json:"remark"`
}

func ensureMaxRunes(value string, key string, maxLen int) error {
	if utf8.RuneCountInString(value) > maxLen {
		return common.NewMessage(key)
	}
	return nil
}

func validateEnterpriseLeadEmail(value string) error {
	address, err := mail.ParseAddress(value)
	if err != nil || address.Address != value || !strings.Contains(value, "@") {
		return common.NewMessage("Please enter a valid email address")
	}
	return nil
}

// SubmitEnterpriseLead stores one submission of the storefront contact form.
// It is intentionally public: the visitors most likely to buy a team contract
// are usually not signed in yet.
func SubmitEnterpriseLead(c *gin.Context) {
	var payload enterpriseLeadPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		common.ApiErrorMsg(c, "Invalid request body")
		return
	}

	company := strings.TrimSpace(payload.Company)
	contactName := strings.TrimSpace(payload.ContactName)
	email := strings.TrimSpace(payload.Email)
	monthlyTokens := strings.TrimSpace(payload.MonthlyTokens)
	requirement := strings.TrimSpace(payload.Requirement)

	if company == "" {
		common.ApiErrorT(c, "Company name is required")
		return
	}
	if contactName == "" {
		common.ApiErrorT(c, "Contact name is required")
		return
	}
	if email == "" {
		common.ApiErrorT(c, "Work email is required")
		return
	}
	for _, check := range []error{
		ensureMaxRunes(company, "Company name is too long", enterpriseLeadMaxCompany),
		ensureMaxRunes(contactName, "Contact name is too long", enterpriseLeadMaxContactName),
		ensureMaxRunes(email, "Work email is too long", enterpriseLeadMaxEmail),
		ensureMaxRunes(monthlyTokens, "Estimated monthly usage is too long", enterpriseLeadMaxTokens),
		ensureMaxRunes(requirement, "Requirement is too long", enterpriseLeadMaxRequirement),
		validateEnterpriseLeadEmail(email),
	} {
		if check != nil {
			common.ApiError(c, check)
			return
		}
	}

	ip := c.ClientIP()
	since := common.GetTimestamp() - enterpriseLeadWindowSeconds
	recent, err := model.CountEnterpriseLeadsFromIp(ip, since)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if recent >= enterpriseLeadWindowLimit {
		common.ApiErrorT(c, "Too many submissions from this address. Please try again later.")
		return
	}

	userAgent := c.Request.UserAgent()
	if utf8.RuneCountInString(userAgent) > 255 {
		userAgent = string([]rune(userAgent)[:255])
	}

	lead := model.EnterpriseLead{
		Company:       company,
		ContactName:   contactName,
		Email:         email,
		MonthlyTokens: monthlyTokens,
		Requirement:   requirement,
		Status:        model.EnterpriseLeadStatusPending,
		UserId:        c.GetInt("id"),
		Ip:            ip,
		UserAgent:     userAgent,
		CreatedTime:   common.GetTimestamp(),
		UpdatedTime:   common.GetTimestamp(),
	}
	if err := lead.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{"id": lead.Id})
}

func GetAllEnterpriseLeads(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)

	status := model.EnterpriseLeadStatusAll
	if raw := strings.TrimSpace(c.Query("status")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < model.EnterpriseLeadStatusPending || parsed > model.EnterpriseLeadStatusClosed {
			common.ApiErrorT(c, "Invalid lead status filter")
			return
		}
		status = parsed
	}

	leads, total, err := model.GetEnterpriseLeads(
		c.Query("keyword"),
		status,
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(leads)
	common.ApiSuccess(c, pageInfo)
}

func UpdateEnterpriseLead(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "Invalid lead id")
		return
	}

	var payload enterpriseLeadUpdatePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		common.ApiErrorMsg(c, "Invalid request body")
		return
	}

	lead, err := model.GetEnterpriseLeadById(id)
	if err != nil {
		if errors.Is(err, model.ErrEnterpriseLeadNotFound) {
			common.ApiErrorT(c, "Lead not found")
			return
		}
		common.ApiError(c, err)
		return
	}

	status := lead.Status
	if payload.Status != nil {
		if *payload.Status < model.EnterpriseLeadStatusPending || *payload.Status > model.EnterpriseLeadStatusClosed {
			common.ApiErrorT(c, "Invalid lead status")
			return
		}
		status = *payload.Status
	}

	remark := lead.Remark
	if payload.Remark != nil {
		remark = strings.TrimSpace(*payload.Remark)
		if err := ensureMaxRunes(remark, "Remark is too long", enterpriseLeadMaxRemark); err != nil {
			common.ApiError(c, err)
			return
		}
	}

	if err := model.UpdateEnterpriseLeadStatus(id, status, remark); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

func DeleteEnterpriseLead(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "Invalid lead id")
		return
	}

	if err := model.DeleteEnterpriseLead(id); err != nil {
		if errors.Is(err, model.ErrEnterpriseLeadNotFound) {
			common.ApiErrorT(c, "Lead not found")
			return
		}
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}
