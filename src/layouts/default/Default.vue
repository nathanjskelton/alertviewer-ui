<template>
  <v-app>
    <app-bar/>
    <default-view @alerts="setAlerts" @alert="setAlert"  @status="setStatus"  />
    
    <v-footer app color="white" class="ma-0 pa-0">
      <v-container fluid class="ma-0 pa-0">
      <v-row dense class="ms-2 me-2 mb-0 mt-0 pa-0">
        <v-col class="ma-0 pa-0">
        <v-alert v-bind:key="item.message" v-for="item in alerts" v-model="alerts" transition="fade-transition" :type="item.type" rounded>{{ item.message }}</v-alert>
        <v-alert v-model="showAlert" transition="fade-transition" :type="alertType" rounded>{{ alert }}</v-alert>
        </v-col>
      </v-row>
      <v-row dense >
        <v-col class="ma-0 pa-0">
        <v-card class="pa-0" height="30px" flat color="grey lighten-2"><v-card-text class="pt-1 ps-5">{{ status }}</v-card-text></v-card>
        </v-col>
      </v-row>
      </v-container>
    </v-footer>
    
  </v-app>
</template>


<script setup>
  
  import AppBar from './AppBar.vue'
  import DefaultView from './View.vue'

  import { ref } from 'vue'

  const alert = ref('');
  const status = ref('Initializing...');
  const alerts = ref([]);
  const alertType = ref('success');
  const showAlert = ref(false);

  function setAlert(x, t) {
    alert.value = x;
    alertType.value = t; 
    showAlert.value = false;
    setTimeout(() => {showAlert.value = true}, 250);
    setTimeout(() => {showAlert.value = false}, 4000);
    console.log("setAlert: "+alert+" type: "+t);
  }

  function setAlerts(x) {
    console.log("setAlerts: "+repr(alerts));
    alerts.value = x;
  }
  
  function setStatus(x) {
    status.value = x;
    console.log("setStatus: "+status);
  }
  
</script>
