package helper

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newPriceErrorContext(t *testing.T, language string) *gin.Context {
	t.Helper()
	gin.SetMode(gin.TestMode)
	require.NoError(t, i18n.Init())
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Request.Header.Set("Accept-Language", language)
	return c
}

// The admin copy is rendered through i18n.T directly: model.IsAdmin needs a
// database, while the branch in modelPriceNotConfiguredError only selects the
// message key.
func TestModelPriceNotConfiguredAdminMessage(t *testing.T) {
	for _, locale := range []struct {
		language string
		marker   string
	}{
		{"zh-CN", "原始模型名"},
		{"zh-TW", "原始模型名"},
		{"en", "original model name"},
	} {
		t.Run(locale.language, func(t *testing.T) {
			c := newPriceErrorContext(t, locale.language)
			message := i18n.T(c, i18n.MsgRelayModelPriceNotConfiguredAdmin, map[string]any{"Model": "deepseek-v4.1-flash"})
			assert.Contains(t, message, "deepseek-v4.1-flash")
			assert.Contains(t, message, locale.marker)
		})
	}
}

func TestModelPriceNotConfiguredErrorNonAdmin(t *testing.T) {
	c := newPriceErrorContext(t, "zh-CN")
	err := modelPriceNotConfiguredError(c, "deepseek-v4.1-flash", 0)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "deepseek-v4.1-flash")
	assert.NotContains(t, err.Error(), "原始模型名")
	assert.NotContains(t, err.Error(), "自用模式")
}
