<template>
  <v-app>
    <v-container fluid class="ma-0 pa-0">

    <v-row dense >
      <v-col class="ma-0 pa-0">
      <v-card class="pa-0 d-flex align-center justify-center" height="30px" flat color="red lighten-2">
        <span>{{ banner }}</span></v-card>
      </v-col>
    </v-row>
    
    </v-container>
    <app-bar :cortana_user=getUser() :cortana_role=getRole() />
    <default-view @alertManagerStatus="setAlertManagers" @alertIntervals="setAlertIntervals"
      :timeline_selection="timelineSelection" @closeTimeline="timelineSelection = null"
      @alerts="setAlerts" @alert="setAlert" @banner="setBanner" @status="setStatus" @lastIngest="setLastIngest" @user="setUser" @role="setRole" />
    
    <v-footer app class="ma-0 pa-0">
      <v-container fluid class="ma-0 pa-0">
      <v-row dense class="ms-2 me-2 mb-0 mt-0 pa-0">
        <v-col class="ma-0 pa-0">
        <v-alert v-bind:key="item.message" v-for="item in alerts" v-model="alerts" transition="fade-transition" :type="item.type" rounded>{{ item.message }}</v-alert>
        <v-alert v-model="showAlert" transition="fade-transition" :type="alertType" rounded>{{ alert }}</v-alert>
        </v-col>
      </v-row>
      <!-- 24h firing history, one bar per minute, coloured by worst severity. -->
      <v-row dense>
        <v-col class="ma-0 pa-0">
        <alert-timeline :intervals="alertIntervals" v-model:selection="timelineSelection" />
        </v-col>
      </v-row>
      <v-row dense >
        <v-col class="ma-0 pa-0">
        <v-card class="pa-0" height="30px" flat color="grey lighten-2"><v-card-text class="pt-1 ps-5">
          {{ status }} &nbsp;&nbsp; Data is {{ lastIngest }} seconds old. <span style="padding-left: 20px;" v-for="item, key in alertManagerStatus">
            <v-icon color=red v-if="lastIngest != 'MANY' && item==false" class="mb-1">mdi-alert-circle</v-icon>
            <v-icon color=#339933 v-if="lastIngest != 'MANY' && item==true" class="mb-1">mdi-check-circle</v-icon>
            <v-icon color=red v-if="lastIngest == 'MANY'" class="mb-1">mdi-help-circle</v-icon>  {{key}}</span></v-card-text></v-card>
        </v-col>
      </v-row>
      <!--      
      <v-row dense >
        <v-col class="ma-0 pa-0">
        <v-card class="pa-0 d-flex align-center justify-center" height="30px" flat color="red lighten-2">
          <span>test</span></v-card>
        </v-col>
      </v-row>
    -->
      </v-container>
    </v-footer>
    
  </v-app>
</template>



<script setup>
  
  import AppBar from './AppBar.vue'
  import DefaultView from './View.vue'
  import AlertTimeline from '@/components/AlertTimeline.vue'
  import axios from "axios";
  import { ref } from 'vue'

  import { getCurrentInstance } from 'vue'

  const { proxy } = getCurrentInstance();
  const bannerText = proxy.$bannerText;

  const alert = ref('');
  const user = ref('');
  const role = ref('');
  const status = ref('Initializing...');
  const lastIngest = ref(0);
  const alerts = ref([]);
  const alertType = ref('success');
  const showAlert = ref(false);
  const banner = ref('');
  
  const alertManagerStatus = ref('');
  const alertIntervals = ref([]);
  const timelineSelection = ref(null);

  function getUser() {
    return user;
  }

  function getRole() {
    return role;
  }

  function getBanner() {
    return banner;
  }

  function setAlert(x, t) {
    alert.value = x;
    alertType.value = t; 
    showAlert.value = false;
    setTimeout(() => {showAlert.value = true}, 250);
    setTimeout(() => {showAlert.value = false}, 4000);
  }

  function setAlerts(x) {
    alerts.value = x;
  }
  
  function setStatus(x) {
    status.value = x;
  }

  function setBanner(x) {
    banner.value = x;
    console.log("Default setBanner: "+x);
  }

  function setLastIngest(x) {
    lastIngest.value = x;
  }

  function setUser(x) {
    user.value = x;
    console.log("Default setUser: "+x);
  }

  function setRole(x) {
    role.value = x;
  }

  function setAlertIntervals(x) {
    alertIntervals.value = x;
  }

  function setAlertManagers(ams) {
    let txt = "";

    alertManagerStatus.value = ams;
  }
</script>
