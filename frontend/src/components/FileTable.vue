<script setup>
import { computed } from 'vue';
import { hasSelection } from '../composables/useRowNav.js';

const props = defineProps({
  rows: { type: Array, required: true },
  selected: { type: Set, required: true },
  showMetadata: { type: Boolean, default: false },
  metadataLoading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'No files.' },
});

const emit = defineEmits(['update:selected', 'openFile']);

const selectableDids = computed(
  () => props.rows.map((r) => `${r.namespace}:${r.name}`),
);
const allSelected = computed(
  () =>
    selectableDids.value.length > 0 &&
    selectableDids.value.every((d) => props.selected.has(d)),
);

function toggleRow(did) {
  const next = new Set(props.selected);
  if (next.has(did)) next.delete(did);
  else next.add(did);
  emit('update:selected', next);
}

function toggleAll() {
  if (allSelected.value) emit('update:selected', new Set());
  else emit('update:selected', new Set(selectableDids.value));
}

function onRowClick(row) {
  if (hasSelection()) return;
  emit('openFile', row.did);
}

function fmtNum(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat().format(n);
}
function fmtBytes(n) {
  if (n == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}
function fmtTimestamp(ts) {
  if (ts == null) return '—';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
function pickRun(row) {
  if (props.metadataLoading && !row.metadata) return '…';
  const runs = row.metadata?.['core.runs'];
  if (Array.isArray(runs) && runs.length) return runs[0];
  return '—';
}
function pickEvents(row) {
  if (props.metadataLoading && !row.metadata) return '…';
  const events = row.metadata?.['core.events'];
  if (Array.isArray(events)) return events.length;
  return '—';
}
</script>

<template>
  <div class="file-table">
    <div class="table-card">
      <div class="table-head" :class="{ 'with-meta': showMetadata }">
        <div class="th col-check">
          <input
            type="checkbox"
            :checked="allSelected"
            :title="allSelected ? 'Deselect all on this page' : 'Select all on this page'"
            @change="toggleAll"
          />
        </div>
        <div class="th col-name">File</div>
        <div v-if="showMetadata" class="th col-run">Run</div>
        <div v-if="showMetadata" class="th col-events">Events</div>
        <div class="th col-size">Size</div>
        <div class="th col-created">Created</div>
      </div>

      <div v-if="rows.length === 0" class="empty">{{ emptyMessage }}</div>

      <div
        v-for="row in rows"
        :key="row.did"
        class="tr"
        :class="{ 'with-meta': showMetadata }"
        @click="onRowClick(row)"
      >
        <div class="td col-check" @click.stop>
          <input
            type="checkbox"
            :checked="selected.has(`${row.namespace}:${row.name}`)"
            @change="toggleRow(`${row.namespace}:${row.name}`)"
          />
        </div>
        <div class="td col-name" :title="`${row.namespace}:${row.name}`">
          <span class="ns">{{ row.namespace }}:</span><span class="nm">{{ row.name }}</span>
        </div>
        <div v-if="showMetadata" class="td col-run">{{ pickRun(row) }}</div>
        <div v-if="showMetadata" class="td col-events">{{ fmtNum(pickEvents(row)) }}</div>
        <div class="td col-size">{{ fmtBytes(row.size) }}</div>
        <div class="td col-created">{{ fmtTimestamp(row.created_timestamp) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-card {
  background: var(--page);
  border: 1px solid var(--rule);
  border-radius: 10px;
  overflow-x: auto;
}
.table-head, .tr {
  display: grid;
  grid-template-columns: 28px 1fr 90px 110px;
  gap: 12px;
  padding: 8px 16px;
  align-items: center;
  min-width: 748px;
}
.table-head.with-meta, .tr.with-meta {
  grid-template-columns: 28px 1fr 70px 80px 90px 110px;
}
.table-head {
  background: var(--page);
  border-bottom: 1px solid var(--rule);
}
.th {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--faint);
}
.tr {
  border-top: 1px solid var(--rule-soft);
  cursor: pointer;
  transition: background 0.12s;
}
.tr:hover { background: var(--surface); }

.col-check { display: flex; align-items: center; justify-content: center; }
.col-check input[type="checkbox"] { margin: 0; cursor: pointer; }

.td { font-size: 12px; color: var(--ink); }
.col-name {
  font-family: var(--font-mono);
  word-break: break-all;
  min-width: 0;
  line-height: 1.4;
}
.col-name .ns { color: var(--faint); font-size: 10.5px; }
.col-name .nm { color: var(--ink); }
.col-run, .col-events, .col-size, .col-created {
  font-family: var(--font-mono);
  text-align: right;
  color: var(--dim);
}

.empty {
  padding: 22px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--dim);
}
</style>
