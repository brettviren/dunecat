import { computed, ref } from 'vue';

// Copy file IDs (namespace:name, one per line) to the clipboard. If the
// user has ticked specific rows, copy those; otherwise copy every row in
// `rowsRef`. Used by FilesView and QueryView to drive their toolbar button
// without re-implementing the same boilerplate.
export function useFileIdCopy(rowsRef, selectedRef) {
  const copyState = ref('idle');  // 'idle' | 'copied' | 'failed'

  const selectableDids = computed(
    () => (rowsRef.value || []).map((r) => `${r.namespace}:${r.name}`),
  );
  const copyCount = computed(
    () => selectedRef.value.size || selectableDids.value.length,
  );

  async function copyDids() {
    const dids = selectedRef.value.size > 0
      ? [...selectedRef.value]
      : selectableDids.value;
    if (!dids.length) return;
    try {
      await navigator.clipboard.writeText(dids.join('\n'));
      copyState.value = 'copied';
    } catch (_e) {
      copyState.value = 'failed';
    }
    setTimeout(() => { copyState.value = 'idle'; }, 1500);
  }

  return { copyState, copyCount, copyDids, selectableDids };
}
