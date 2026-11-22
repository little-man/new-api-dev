package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func setupEnterpriseLeadControllerTest(t *testing.T) {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousType, previousLogType := common.MainDatabaseType(), common.LogDatabaseType()
	previousMaster, previousCache, previousRedis, previousSQLite := common.IsMasterNode, common.MemoryCacheEnabled, common.RedisEnabled, common.SQLitePath
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousType, previousLogType)
		common.IsMasterNode, common.MemoryCacheEnabled, common.RedisEnabled, common.SQLitePath = previousMaster, previousCache, previousRedis, previousSQLite
		gin.SetMode(gin.TestMode)
	})
	t.Setenv("SQL_DSN", "")
	t.Setenv("LOG_SQL_DSN", "")
	common.IsMasterNode, common.MemoryCacheEnabled, common.RedisEnabled = false, false, false
	common.SQLitePath = filepath.Join(t.TempDir(), "enterprise-lead.db")
	require.NoError(t, model.InitDB())
	database := model.DB
	sqlDB, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	model.LOG_DB = database
	common.SetLogDatabaseType(common.MainDatabaseType())
	require.NoError(t, database.AutoMigrate(&model.EnterpriseLead{}))
	gin.SetMode(gin.TestMode)
}

func postEnterpriseLead(t *testing.T, body string, remoteAddr string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/enterprise/lead", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = remoteAddr
	ctx.Request = request
	return ctx, recorder
}

func decodeLeadResponse(t *testing.T, recorder *httptest.ResponseRecorder) (success bool, message string) {
	t.Helper()
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	return payload.Success, payload.Message
}

func countStoredLeads(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, model.DB.Model(&model.EnterpriseLead{}).Count(&count).Error)
	return count
}

func TestSubmitEnterpriseLeadStoresRow(t *testing.T) {
	setupEnterpriseLeadControllerTest(t)

	const body = `{
		"company": "  Acme Cloud  ",
		"contact_name": "Ada",
		"email": "ada@acme.test",
		"monthly_tokens": "50M tokens",
		"requirement": "Invoice + SLA"
	}`
	ctx, recorder := postEnterpriseLead(t, body, "203.0.113.7:51234")
	SubmitEnterpriseLead(ctx)

	success, message := decodeLeadResponse(t, recorder)
	require.True(t, success, message)
	require.EqualValues(t, http.StatusOK, recorder.Code)
	assert.Equal(t, int64(1), countStoredLeads(t))

	var stored model.EnterpriseLead
	require.NoError(t, model.DB.First(&stored).Error)
	assert.Equal(t, "Acme Cloud", stored.Company)
	assert.Equal(t, "Ada", stored.ContactName)
	assert.Equal(t, "ada@acme.test", stored.Email)
	assert.Equal(t, "50M tokens", stored.MonthlyTokens)
	assert.Equal(t, "Invoice + SLA", stored.Requirement)
	assert.Equal(t, model.EnterpriseLeadStatusPending, stored.Status)
	assert.Equal(t, 0, stored.UserId)
	assert.Equal(t, "203.0.113.7", stored.Ip)
	assert.NotZero(t, stored.CreatedTime)
}

func TestSubmitEnterpriseLeadRejectsInvalidInput(t *testing.T) {
	setupEnterpriseLeadControllerTest(t)

	tests := []struct {
		name string
		body string
	}{
		{
			name: "missing company",
			body: `{"company":"   ","contact_name":"Ada","email":"ada@acme.test"}`,
		},
		{
			name: "missing contact name",
			body: `{"company":"Acme","contact_name":"","email":"ada@acme.test"}`,
		},
		{
			name: "invalid email",
			body: `{"company":"Acme","contact_name":"Ada","email":"not-an-email"}`,
		},
		{
			name: "company too long",
			body: `{"company":"` + strings.Repeat("x", 129) + `","contact_name":"Ada","email":"ada@acme.test"}`,
		},
		{
			name: "malformed json",
			body: `{"company":`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx, recorder := postEnterpriseLead(t, tc.body, "203.0.113.8:51234")
			SubmitEnterpriseLead(ctx)

			success, _ := decodeLeadResponse(t, recorder)
			assert.False(t, success)
			assert.Equal(t, int64(0), countStoredLeads(t))
		})
	}
}

func TestSubmitEnterpriseLeadLimitsRepeatedSubmissions(t *testing.T) {
	setupEnterpriseLeadControllerTest(t)

	const body = `{"company":"Acme","contact_name":"Ada","email":"ada@acme.test"}`

	for i := range enterpriseLeadWindowLimit {
		ctx, recorder := postEnterpriseLead(t, body, "203.0.113.9:51234")
		SubmitEnterpriseLead(ctx)
		success, message := decodeLeadResponse(t, recorder)
		require.True(t, success, "submission %d rejected: %s", i+1, message)
	}

	ctx, recorder := postEnterpriseLead(t, body, "203.0.113.9:51234")
	SubmitEnterpriseLead(ctx)
	success, message := decodeLeadResponse(t, recorder)
	assert.False(t, success)
	assert.Contains(t, message, "Too many submissions")
	assert.Equal(t, int64(enterpriseLeadWindowLimit), countStoredLeads(t))

	// A different address is not affected by the first one's window.
	ctx, recorder = postEnterpriseLead(t, body, "198.51.100.4:51234")
	SubmitEnterpriseLead(ctx)
	success, _ = decodeLeadResponse(t, recorder)
	assert.True(t, success)
	assert.Equal(t, int64(enterpriseLeadWindowLimit+1), countStoredLeads(t))
}
