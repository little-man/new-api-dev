package model

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/QuantumNous/new-api/common"
)

// Enterprise lead status values are small integers so the admin list can sort
// and filter them without depending on display strings.
const (
	EnterpriseLeadStatusPending   = 0
	EnterpriseLeadStatusContacted = 1
	EnterpriseLeadStatusWon       = 2
	EnterpriseLeadStatusClosed    = 3
)

// EnterpriseLeadStatusAll is the filter value that disables the status filter.
const EnterpriseLeadStatusAll = -1

var ErrEnterpriseLeadNotFound = errors.New("enterprise lead not found")

// EnterpriseLead is one submission of the storefront "contact sales" form.
// Anonymous visitors can submit it, so UserId is 0 for them and the request
// metadata (Ip, UserAgent) is kept for abuse investigation.
type EnterpriseLead struct {
	Id            int            `json:"id"`
	Company       string         `json:"company" gorm:"type:varchar(128);not null"`
	ContactName   string         `json:"contact_name" gorm:"type:varchar(64);not null"`
	Email         string         `json:"email" gorm:"type:varchar(254);not null;index"`
	MonthlyTokens string         `json:"monthly_tokens" gorm:"type:varchar(64)"`
	Requirement   string         `json:"requirement" gorm:"type:text"`
	Status        int            `json:"status" gorm:"default:0;index"`
	Remark        string         `json:"remark" gorm:"type:text"`
	UserId        int            `json:"user_id" gorm:"index"`
	Ip            string         `json:"ip" gorm:"type:varchar(64)"`
	UserAgent     string         `json:"user_agent" gorm:"type:varchar(255)"`
	CreatedTime   int64          `json:"created_time" gorm:"bigint;index"`
	UpdatedTime   int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt     gorm.DeletedAt `gorm:"index"`
}

func (lead *EnterpriseLead) Insert() error {
	return DB.Create(lead).Error
}

// GetEnterpriseLeads returns one page of leads for the admin console. A
// negative status means "any status"; keyword matches company, contact and
// email.
func GetEnterpriseLeads(keyword string, status int, startIdx int, num int) (leads []*EnterpriseLead, total int64, err error) {
	query := DB.Model(&EnterpriseLead{})

	if trimmed := strings.TrimSpace(keyword); trimmed != "" {
		like := "%" + trimmed + "%"
		query = query.Where(
			"company LIKE ? OR contact_name LIKE ? OR email LIKE ?",
			like,
			like,
			like,
		)
	}
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	if err = query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&leads).Error; err != nil {
		return nil, 0, err
	}
	return leads, total, nil
}

func GetEnterpriseLeadById(id int) (*EnterpriseLead, error) {
	var lead EnterpriseLead
	err := DB.First(&lead, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrEnterpriseLeadNotFound
	}
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

// UpdateEnterpriseLeadStatus stores the follow-up state chosen by an admin.
func UpdateEnterpriseLeadStatus(id int, status int, remark string) error {
	result := DB.Model(&EnterpriseLead{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":       status,
			"remark":       remark,
			"updated_time": common.GetTimestamp(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrEnterpriseLeadNotFound
	}
	return nil
}

func DeleteEnterpriseLead(id int) error {
	result := DB.Delete(&EnterpriseLead{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrEnterpriseLeadNotFound
	}
	return nil
}

// CountEnterpriseLeadsFromIp guards the public endpoint against someone
// inserting rows in a loop: one address may only create a limited number of
// leads inside the window.
func CountEnterpriseLeadsFromIp(ip string, since int64) (int64, error) {
	if ip == "" {
		return 0, nil
	}
	var count int64
	err := DB.Model(&EnterpriseLead{}).
		Where("ip = ? AND created_time >= ?", ip, since).
		Count(&count).Error
	return count, err
}
