package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupEnterpriseLeadTest(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&EnterpriseLead{}))
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&EnterpriseLead{}).Error)
	t.Cleanup(func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&EnterpriseLead{}).Error)
	})
}

func TestGetEnterpriseLeadsFiltersByKeywordAndStatus(t *testing.T) {
	setupEnterpriseLeadTest(t)

	now := common.GetTimestamp()
	leads := []EnterpriseLead{
		{Company: "Acme Cloud", ContactName: "Ada", Email: "ada@acme.test", Status: EnterpriseLeadStatusPending, CreatedTime: now},
		{Company: "Acme Cloud", ContactName: "Bob", Email: "bob@other.test", Status: EnterpriseLeadStatusContacted, CreatedTime: now},
		{Company: "Globex", ContactName: "Carol", Email: "carol@acme.test", Status: EnterpriseLeadStatusPending, CreatedTime: now},
		{Company: "Initech", ContactName: "Dave", Email: "dave@initech.test", Status: EnterpriseLeadStatusWon, CreatedTime: now},
	}
	require.NoError(t, DB.Create(&leads).Error)

	tests := []struct {
		name      string
		keyword   string
		status    int
		startIdx  int
		num       int
		wantTotal int64
		wantIds   []int
	}{
		{
			name:      "no filters returns every lead newest first",
			status:    EnterpriseLeadStatusAll,
			num:       10,
			wantTotal: 4,
			wantIds:   []int{4, 3, 2, 1},
		},
		{
			name:      "keyword matches company and email",
			keyword:   "acme",
			status:    EnterpriseLeadStatusAll,
			num:       10,
			wantTotal: 3,
			wantIds:   []int{3, 2, 1},
		},
		{
			name:      "status filter narrows to follow-up stage",
			status:    EnterpriseLeadStatusContacted,
			num:       10,
			wantTotal: 1,
			wantIds:   []int{2},
		},
		{
			name:      "pagination keeps the total of the filtered set",
			status:    EnterpriseLeadStatusAll,
			startIdx:  1,
			num:       2,
			wantTotal: 4,
			wantIds:   []int{3, 2},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, total, err := GetEnterpriseLeads(tc.keyword, tc.status, tc.startIdx, tc.num)
			require.NoError(t, err)
			assert.Equal(t, tc.wantTotal, total)
			ids := make([]int, 0, len(got))
			for _, lead := range got {
				ids = append(ids, lead.Id)
			}
			assert.Equal(t, tc.wantIds, ids)
		})
	}
}

func TestEnterpriseLeadUpdateAndDelete(t *testing.T) {
	setupEnterpriseLeadTest(t)

	lead := EnterpriseLead{
		Company:     "Acme Cloud",
		ContactName: "Ada",
		Email:       "ada@acme.test",
		Status:      EnterpriseLeadStatusPending,
		CreatedTime: common.GetTimestamp(),
		UpdatedTime: common.GetTimestamp(),
	}
	require.NoError(t, lead.Insert())
	require.NotZero(t, lead.Id)

	require.NoError(t, UpdateEnterpriseLeadStatus(lead.Id, EnterpriseLeadStatusWon, "signed annual contract"))

	reloaded, err := GetEnterpriseLeadById(lead.Id)
	require.NoError(t, err)
	assert.Equal(t, EnterpriseLeadStatusWon, reloaded.Status)
	assert.Equal(t, "signed annual contract", reloaded.Remark)

	require.NoError(t, DeleteEnterpriseLead(lead.Id))
	_, err = GetEnterpriseLeadById(lead.Id)
	assert.ErrorIs(t, err, ErrEnterpriseLeadNotFound)

	assert.ErrorIs(t, UpdateEnterpriseLeadStatus(lead.Id, EnterpriseLeadStatusContacted, ""), ErrEnterpriseLeadNotFound)
	assert.ErrorIs(t, DeleteEnterpriseLead(lead.Id), ErrEnterpriseLeadNotFound)
}

func TestCountEnterpriseLeadsFromIpHonorsWindow(t *testing.T) {
	setupEnterpriseLeadTest(t)

	now := common.GetTimestamp()
	leads := []EnterpriseLead{
		{Company: "Acme", ContactName: "Ada", Email: "ada@acme.test", Ip: "203.0.113.7", CreatedTime: now},
		{Company: "Acme", ContactName: "Bob", Email: "bob@acme.test", Ip: "203.0.113.7", CreatedTime: now - 60},
		{Company: "Acme", ContactName: "Carol", Email: "carol@acme.test", Ip: "203.0.113.7", CreatedTime: now - 7200},
		{Company: "Globex", ContactName: "Dave", Email: "dave@globex.test", Ip: "198.51.100.9", CreatedTime: now},
	}
	require.NoError(t, DB.Create(&leads).Error)

	count, err := CountEnterpriseLeadsFromIp("203.0.113.7", now-3600)
	require.NoError(t, err)
	assert.Equal(t, int64(2), count)

	count, err = CountEnterpriseLeadsFromIp("203.0.113.7", now-86400)
	require.NoError(t, err)
	assert.Equal(t, int64(3), count)

	count, err = CountEnterpriseLeadsFromIp("", now-86400)
	require.NoError(t, err)
	assert.Equal(t, int64(0), count)
}
