<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";

interface Report {
  id: string; title: string; category: string; summary: string;
  created_by: string; created_at: string;
}
const reports = ref<Report[]>([]);
const total = ref(0);
const loading = ref(false);
const category = ref("");
const categories = ["", "sales", "finance", "hr", "operations"];
const catLabels: Record<string, string> = { "": "全部", sales: "销售", finance: "财务", hr: "人力资源", operations: "运营" };

async function loadReports() {
  loading.value = true;
  try {
    const res = await invoke<{ reports: Report[]; total: number }>("list_reports", {
      query: { category: category.value || null, page: 1, pageSize: 20 }
    });
    reports.value = res.reports;
    total.value = res.total;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
}

async function viewDetail(id: string) {
  try {
    const detail = await invoke<Report>("get_report_detail", { reportId: id });
    alert(`报表详情:\n${detail.title}\n${detail.summary}\n\n${JSON.stringify(detail.data, null, 2)}`);
  } catch (e) { alert(String(e)); }
}

onMounted(loadReports);
</script>

<template>
  <div>
    <div class="header-row">
      <h1>📋 报表中心</h1>
      <div class="filter-row">
        <select v-model="category" @change="loadReports">
          <option v-for="c in categories" :key="c" :value="c">{{ catLabels[c] }}</option>
        </select>
        <button @click="loadReports" :disabled="loading">🔄 刷新</button>
      </div>
    </div>
    <p style="color:var(--text-secondary);margin-bottom:16px">共 {{ total }} 条报表</p>
    <div class="report-list">
      <div v-for="r in reports" :key="r.id" class="report-card" @click="viewDetail(r.id)">
        <div class="report-header">
          <strong>{{ r.title }}</strong>
          <span class="cat-tag">{{ catLabels[r.category] || r.category }}</span>
        </div>
        <p class="summary">{{ r.summary }}</p>
        <div class="meta">{{ r.created_by }} · {{ r.created_at }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.header-row h1 { font-size: 24px; }
.filter-row { display: flex; gap: 8px; }
select, button {
  background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary);
  padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer;
}
button { background: linear-gradient(135deg, #238636, #2ea043); border-color: #3fb950; color: #fff; font-weight: 600; }
button:disabled { opacity: 0.5; }
.report-list { display: grid; gap: 10px; }
.report-card {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px;
  padding: 14px 18px; cursor: pointer; transition: border-color 0.15s;
}
.report-card:hover { border-color: var(--accent-blue); }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.report-header strong { font-size: 15px; color: var(--accent-blue); }
.cat-tag {
  background: var(--bg-tertiary); padding: 2px 10px; border-radius: 10px;
  font-size: 11px; color: var(--accent-purple);
}
.summary { color: var(--text-secondary); font-size: 13px; margin-bottom: 4px; }
.meta { font-size: 11px; color: var(--text-secondary); }
</style>
