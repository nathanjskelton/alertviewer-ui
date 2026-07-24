<template>
  <router-view />
</template>

<script setup>
  //
</script>

<style>


.customize-table {

  --easy-table-border: none;
  --easy-table-row-border: 1px solid #eef2f7;

  --easy-table-header-background-color: #ffffff;
  --easy-table-header-font-color: #64748b;
  --easy-table-header-font-size: 11px;
  --easy-table-header-height: 34px;

  --easy-table-header-item-padding: 2px 8px;

  --easy-table-body-row-height: 35px;
  --easy-table-body-row-font-size: 12px;

  --easy-table-body-item-padding: 2px 5px;

}

/* Clean, modern table header: no heavy grey block, just an uppercase
   label row with a subtle underline and no vertical separators. */
.customize-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  border-right: none !important;
  border-bottom: 2px solid #e2e8f0 !important;
}
.customize-table tbody td {
  border-right: none !important;
}

/* Fixed column layout so the single shared header (.master-header) and every
   grouped body table line up column-for-column regardless of content. */
.customize-table table {
  table-layout: fixed;
  width: 100%;
}
.customize-table th:nth-child(1), .customize-table td:nth-child(1) { width: 40px; }
.customize-table th:nth-child(2), .customize-table td:nth-child(2) { width: 76px; }
.customize-table th:nth-child(3), .customize-table td:nth-child(3) { width: 90px; }
.customize-table th:nth-child(4), .customize-table td:nth-child(4) { width: 96px; }
.customize-table th:nth-child(5), .customize-table td:nth-child(5) { width: 84px; }
.customize-table th:nth-child(6), .customize-table td:nth-child(6) { width: 150px; }
.customize-table th:nth-child(7), .customize-table td:nth-child(7) { width: 150px; }
.customize-table th:nth-child(8), .customize-table td:nth-child(8) { width: 110px; }
/* column 9 (Summary) intentionally left auto to take the remaining width */

/* The shared header table carries no rows of its own — hide its empty body
   and the "No Available Data" placeholder so only the header row shows. */
.master-header tbody { display: none; }
.master-header-root .vue3-easy-data-table__message { display: none; }

/* Rows whose alertmanager is offline: data may be stale — grey the row. */
.customize-table tbody tr.stale-row td {
  background-color: #eceff1 !important;
}
.customize-table tbody tr.stale-row td:first-child {
  box-shadow: inset 4px 0 0 #90a4ae;
}

/* Freshly firing alerts: red for <=1 min, lighter red for <=10 min. */
.customize-table tbody tr.firing-new-row td {
  background-color: #fca5a5 !important;
}
.customize-table tbody tr.firing-new-row td:first-child {
  box-shadow: inset 4px 0 0 #dc2626;
}
.customize-table tbody tr.firing-recent-row td {
  background-color: #fee2e2 !important;
}
.customize-table tbody tr.firing-recent-row td:first-child {
  box-shadow: inset 4px 0 0 #f87171;
}

.v-expansion-panel-text__wrapper { padding: 0 !important; }
</style>