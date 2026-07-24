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

.v-expansion-panel-text__wrapper { padding: 0 !important; }
</style>