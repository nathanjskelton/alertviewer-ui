<template>
  <div>
    <v-app-bar
      color="deep-purple accent-4"
      dense
      dark
    >
      <v-app-bar-nav-icon></v-app-bar-nav-icon>

      <v-toolbar-title>GM Alert Viewer</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn class="mb-2" icon>
        <v-switch v-model="autoRefresh"></v-switch>
      </v-btn>

      <v-btn tile @click="fetchData()" target="_blank" text :color="refreshStyle">
        Query
        <v-icon>mdi-database-refresh</v-icon>
      </v-btn>

      <v-btn tile @click.stop="fetchData(true)" target="_blank" text>
        <div >
          Export
          <v-icon>mdi-application-export</v-icon>
        </div>
      </v-btn>

     
    </v-app-bar>
  </div>
</template>

<script setup>
  //
</script>
