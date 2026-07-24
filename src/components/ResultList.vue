/* eslint-disable prettier/prettier */
<template>
  <v-app-bar class="mt-5"
    color="purple-lighten-5"
    density="compact"
    dark
    flat
  >    
    <v-icon size="x-large" v-if="showDrawer==false" @click="toggleDrawer();">mdi-menu-right</v-icon>
    <v-icon size="x-large" v-if="showDrawer==true" @click="toggleDrawer();">mdi-menu-left</v-icon>
    <div style="font-synthesis-small-caps: auto; font-size: x-small; color: purple">FILTERS</div>

    <div style="width: 65px;margin-top: 15px;margin-left: 200px">
      <v-select density="compact" variant="underlined" :single-line=true v-model="this.rowsPerPage" label="Rows per Page"
          :items="[1,5,15,25,50,100]" @update:modelValue="this.setQueryString(); this.updateDataTables();">
      </v-select>
    </div>
    <div style="width: 50px;margin-top: 2px;margin-left: 6px;">rows</div>
    <v-spacer></v-spacer>
    
    

    <div v-if="Object.keys(this.info)[0] != 'ALL'">
      <v-slide-group mandatory="force" v-model="expandMode">
        <v-slide-group-item value="none"
          v-slot="{ isSelected, toggle }"
        >
          <v-btn
            rounded="0"
            density=compact
            :color="isSelected ? 'purple' : '#999'"
            :style="isSelected ? 'border-left: 4px solid purple; padding-left: 1px;' : 'padding-left: 5px'"
            class="ma-1 mt-2"
            @click="toggle"
          >
            Expand None
          </v-btn>
        </v-slide-group-item>
        <v-slide-group-item value="first"
          v-slot="{ isSelected, toggle }"
        >
          <v-btn
            rounded="0"
            density=compact
            :color="isSelected ? 'purple' : '#999'"
            :style="isSelected ? 'border-left: 4px solid purple; padding-left: 1px;' : 'padding-left: 5px'"
            class="ma-1 mt-2"
            @click="toggle"
          >
            Expand First
          </v-btn>
        </v-slide-group-item>
        <v-slide-group-item value="all"
          v-slot="{ isSelected, toggle }"
        >
          <v-btn
            rounded="0"
            density=compact
            :color="isSelected ? 'purple' : '#999'"
            :style="isSelected ? 'border-left: 4px solid purple; padding-left: 1px;' : 'padding-left: 5px'"
            class="ma-1 mt-2"
            @click="toggle"
          >
            Expand All
          </v-btn>
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <div class="mt-6 mr-6 ml-15" >
      <v-switch color='amber-darken-2' true-icon="mdi-tag-multiple" false-icon="mdi-tag-off" v-model="showExtraLabels" :label="showExtraLabels ? 'extra labels shown' : 'extra labels hidden'" density="compact" @update:modelValue="this.setQueryString();"></v-switch>
    </div>

    <div class="mt-6 mr-9" >
      <v-switch color='green' true-icon="mdi-refresh" false-icon="mdi-close" :style="autoRefresh ? 'color: green;' : 'color: red;'" v-model="autoRefresh" :label="autoRefresh ? 'auto-refresh enabled' : 'auto-refresh disabled'"  density="compact" @update:modelValue="this.setQueryString();"></v-switch>
    </div>

    <v-btn class="mt-0" tile @click="fetchData()" target="_blank" text :color="refreshStyle">
      Refresh
      <v-icon>mdi-database-refresh</v-icon>
    </v-btn>

    <!--
    <v-btn class="mt-0" tile @click.stop="fetchData(true)" target="_blank" text>
      <div >
        Export
        <v-icon>mdi-application-export</v-icon>
      </div>
    </v-btn>
    -->
  </v-app-bar>

    
  <!-- DRAWER -->

  <v-navigation-drawer v-model="showDrawer" app color="purple-lighten-5" class="mt-5">
    <div class="px-2 mt-0">
      <v-btn width=250 height=50 @click="searchAlertName=null;searchTeam=null;searchInstance=null;searchSummary=null;
          searchGmInstance=[];panel=[];groupField=null;searchSeverity=[];
          gmInstances =[];statuses=['NEW','FLAPPING']" target="_blank" text style="background-color:rgba(0, 0, 0, 0.04);">
        <span class="mr-2">Clear</span>
        <v-icon>mdi-notification-clear-all</v-icon>
      </v-btn>
    </div>
    
    <div class="pa-2 mt-0 mb-0"><table style="width: 100%"><tr>
      <td v-if="groupField != null" style="width: 30px"><v-icon @click="groupField=null;panel=[];fetchData();">mdi-broom</v-icon></td>
        <v-select style="max-height: 50px" :items="allFields" v-model="groupField" label="Group by Field"></v-select>
      <td></td></tr></table>
    </div>
    
    


    <div class="pa-2" >
      <v-card class="px-2" style="background-color:rgba(0, 0, 0, 0.04);" >
        <v-card-title style="max-height: 45px" class="caption">Status</v-card-title>
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="FIRING" value="NEW" append-icon="mdi-alert-outline"></v-checkbox>
          
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="ACKED" value="ACKED" append-icon="mdi-account-check"></v-checkbox>
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="RESOLVED" value="RESOLVED" append-icon="mdi-checkbox-marked-circle-outline"></v-checkbox>
          <v-checkbox style="margin-bottom: 10px; max-height: 45px" hide-details dense v-model="statuses" label="SILENCED" value="SILENCED" append-icon="mdi-sleep"></v-checkbox>
          
      </v-card>

      <v-card class="mt-2 px-2" style="background-color:rgba(0, 0, 0, 0.04);" >
        <v-card-title style="max-height: 45px" class="caption">Attributes</v-card-title>
        <v-checkbox style="margin-bottom: 10px; max-height: 45px" hide-details dense v-model="statuses" label="FLAPPING" value="FLAPPING" append-icon="mdi-sync-alert"></v-checkbox>
      </v-card>

    </div>
  </v-navigation-drawer>


  <!-- DIALOGS -->

  <v-dialog max-width="90%" v-model="alertDetails.dialog" persistent >
    <v-card class="pa-3">
      <v-card-title class="pa-4" style="background-color: purple; color: white; font-size: large; font-weight: bold;">
        <table style="width: 100%;"><tr><td>Alert Details</td><td align="right"><v-icon @click="alertDetails.dialog=false;">mdi-window-close</v-icon></td></tr></table>
      </v-card-title>
      <v-card-text>
        <v-container fluid>
          <v-row><v-col>

            <div>
              <span class="ps-5">
                <v-chip color="green lighten-1" size="small">STARTED</v-chip>
                {{ alertDetails.item.friendlyStartTime  }}
              </span>
              <span class="ps-5">
                <v-chip color="red lighten-1" size="small">ENDS</v-chip>
                {{ alertDetails.item.friendlyEndTime }}
              </span>
            </div>
          </v-col></v-row> 
          <v-row >
            <v-col class="pt-0 mt-0" cols="4" offset="0">
              <div style="margin-left: 20px; font-size: 16px; font-weight: bold;">Details</div>
            </v-col>
            <v-col class="pt-0 mt-0">
              <div style="font-weight: bold; font-size: 16px;">Notes</div>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="pt-0 mt-0" cols="4" >
                <div style="font-size: 14px;margin-left: 20px; font-weight: bold; color: #944">{{alertDetails.item.alert.labels.alertname}}</div>
                <div style="font-size: 14px;margin-left: 20px; font-weight: bold; color: #779">{{alertDetails.item.alertmanager}}</div>

                <div style="font-size: 14px;margin-left: 20px; margin-top: 15px; font-weight: bold;">Summary</div>
                <div style="font-size: 12px;margin-left: 20px; vertical-align: top; white-space: pre-wrap;" v-html="alertDetails.item.alert.annotations.summary"></div>

                <div style="font-size: 12px;margin-left: 20px;margin-top: 15px;"><span style="font-weight: bold"> Acked: </span> {{alertDetails.item.acked}}</div>
                <div style="font-size: 12px;margin-left: 20px;"><span style="font-weight: bold"> Flapping: </span> {{alertDetails.item.flapping}}</div>


                <div style="font-size: 12px;margin-left: 20px;margin-top: 15px;"><span style="font-weight: bold"> Severity: </span> {{alertDetails.item.alert.labels.severity}}</div>
                <div style="font-size: 12px;margin-left: 20px;"><span style="font-weight: bold"> Instance: </span> {{alertDetails.item.alert.labels.instance}}</div>
                <div style="font-size: 12px;margin-left: 20px;"><span style="font-weight: bold"> GM: </span> {{alertDetails.item.alert.labels.gm_instance}}</div>
                <div style="font-size: 12px;margin-left: 20px;"><span style="font-weight: bold"> Team: </span> {{alertDetails.item.alert.labels.team}}</div>


                <div style="font-size: 14px;margin-left: 20px; margin-top: 15px;"><span style="font-weight: bold">Additional Labels</span></div>
                <div v-for="value, label in alertDetails.item.alert.labels" class="mx-0 px-0">
                  <div v-if="label != 'instance'
                        && label != 'gm_instance' && label != 'severity'
                        && label != 'alertname'" style="font-size: 12px;margin-left: 20px;" class="px-0"> <span style="color: #777; font-weight: bold">{{ label }}: </span> {{ value }} </div>
                </div>

                <div style="font-size: 14px;margin-left: 20px; margin-top: 15px;"><span style="font-weight: bold">Additional Annotations</span></div>
                <div v-for="value, label in alertDetails.item.alert.annotations" class="mx-0 px-0">
                  <div v-if="label != 'service'
                        && label != 'summary'"  style="font-size: 12px;margin-left: 20px;" class="px-0"> <span style="color: #777; font-weight: bold">{{ label }}: </span> {{ value }} </div>
                </div>

            </v-col>
            <v-col class="pt-0 mt-0" cols=8>
              <v-list style="margin-left: 0; padding-left: 0;margin-top: 0; padding-top: 0;background-color: inherit" density="compact">
                <v-list-item v-for="note in alertDetails.item.notes" class="mx-0 px-0">
                  <div class="px-0 mx-0" style="font-size: 12px;"><v-chip size="small">{{ note.timestamp }}</v-chip><v-chip size="small">{{ note.user }}</v-chip> {{ note.message }} </div>
                </v-list-item>
              </v-list>

            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

    </v-card>
  </v-dialog>

  <v-dialog max-width="480px" v-model="annotationsDialog.dialog">
    <v-card v-if="annotationsDialog.item != null">
      <v-card-title class="pa-3" style="background-color: purple; color: white; font-size: medium; font-weight: bold;">
        <table style="width: 100%;"><tr>
          <td>Annotations</td>
          <td align="right"><v-icon color="white" @click="annotationsDialog.dialog=false;">mdi-window-close</v-icon></td>
        </tr></table>
      </v-card-title>
      <v-card-text class="pa-3">
        <div v-for="tag in getExtraAnnotations(annotationsDialog.item)" :key="tag.key" class="mb-2">
          <div style="font-size: 12px; font-weight: bold; color: #6b21a8;">{{ tag.key }}</div>
          <div style="font-size: 12px; white-space: pre-wrap;">{{ tag.value }}</div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog max-width="500px" v-model="copyDialog.dialog">
    <v-card>
      <v-card-title>{{copyDialog.title}}</v-card-title>
      <v-card-text>
        <v-textarea readonly ref="copydialog" :value="copyDialog.text"></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text @click="copyDialogText()">Copy/Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog max-width="600px" v-model="note.dialog" persistent>
    <v-card>
      <v-card-text>
        <v-textarea v-model="note.message" :label="note.caption"></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text @click="note.dialog=false;saveNote();">Apply</v-btn>
        <v-btn v-if="note.prefix == 'Note'" color="blue-darken-1" text @click="note.dialog=false;">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog max-width="600px" v-model="jira.dialog" persistent>
    <v-card>
      <v-card-text>
        <v-row>
          <v-col cols="3">Summary</v-col>
          <v-col><v-text-field v-model="currentJira.summary"></v-text-field></v-col>
        </v-row>
        <v-row>
          <v-col cols="3">Description</v-col>
          <v-col><v-textarea v-model="currentJira.description"></v-textarea></v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text @click="jira.dialog=false;saveJira();">Submit </v-btn>
        <v-btn color="blue-darken-1" text @click="jira.dialog=false;">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog max-width="700px" v-model="silence.dialog" persistent>
    <v-card class="pa-3">
      <v-card-title class="pa-4" style="background-color: purple; color: white; font-size: large; font-weight: bold;">Silence</v-card-title>
      <v-card-text>
        <v-form dense>
          
          <v-row class="pa-0 ma-0">
            <v-col cols=12 class="pt-0 pb-0 px-0 ma-0">

              <v-card
                class="mx-auto"
                max-width="620"
              >
                <v-card-item class="bg-purple-lighten-4">
                  <v-card-title>
                    Matchers
                  </v-card-title>

                  <template v-slot:append>
                    <v-btn
                      color="white"
                      icon="mdi-plus"
                      size="small"
                      @click="newMatcher();"
                    ></v-btn>
                  </template>

                </v-card-item>

                <v-divider></v-divider>

                <v-virtual-scroll
                  :items="currentSilence.matchers"
                  height=160
                  item-height="50"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item>
                      <v-container class="pa-0 ma-0"><v-row dense no-gutters >
                      <v-col cols="1" class="pt-2 pl-2">
                        <v-icon @click="deleteMatcher(item.name, item.value);" size="x-large" color="purple-lighten-2">mdi-delete-circle</v-icon>
                      </v-col>
                      
                      <v-col cols="5">
                        <v-list-item><v-text-field v-model="item.name" density="compact"></v-text-field></v-list-item>
                      </v-col>
                      <v-col cols="1" class="pt-2 pl-2"> 
                        <v-icon @click="toggleMatcher(item.name, item.value)" v-if="item.isEqual == true" size="x-large" color="grey-lighten-2">mdi-equal-box</v-icon>
                        <v-icon @click="toggleMatcher(item.name, item.value)" v-if="item.isEqual == false" size="x-large" color="grey-lighten-2">mdi-code-not-equal</v-icon>
                      </v-col>
                      <v-col cols="5">
                        <v-list-item><v-text-field v-model="item.value" density="compact"></v-text-field></v-list-item>
                      </v-col>
                    </v-row></v-container>
                    </v-list-item>
                  </template>
                </v-virtual-scroll>
              </v-card>

            </v-col>
          </v-row >
          
          <v-row class="px-0 mx-0">
            <v-col cols=2 class="pt-4 pb-0 px-0 ma-0"><div>Comment</div></v-col>
            <v-col cols=10 class="pa-0 ma-0"><v-text-field v-model="currentSilence.comment"></v-text-field></v-col>
          </v-row>
          <v-row class="pa-0 ma-0">
            <v-col cols=2 class="pt-4 pb-0 px-0 ma-0"><div>Hours</div></v-col>
            <v-col cols=2 class="pa-0 ma-0"><v-text-field v-model="currentSilence.hours"></v-text-field></v-col>
          </v-row>
          <v-row class="px-0 mx-0">
            <v-col cols=12 class="pa-0 ma-0">
              
              <v-select
                    :items="alertmanagers"
                    density="compact"
                    label="Alertmanager"
                    v-model="currentSilence.alertmanager"
              ></v-select>
              
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn color="blue-darken-1" text @click="silence.dialog=false;saveSilence();">Save</v-btn>
        <v-btn color="blue-darken-1" text @click="silence.dialog=false;">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  
  <!--
  <v-toolbar dense color="purple-lighten-5" height="50" elevation=3>      
    <v-text-field
      clearable
      clear-icon="mdi-broom"
      dense
      v-model="searchValue"
      label="Search"
      single-line
      hide-details
    ></v-text-field>    
  </v-toolbar> 
  -->

  <!-- Single shared column header (with filters) for all groups -->
  <EasyDataTable
    class="master-header-root"
    :headers="headers"
    :items="[]"
    :sort-by="sortBy"
    :sort-type="sortType"
    :filter-options="filterOptions"
    :header-item-class-name="headerItemClassName"
    :table-min-height="0"
    hide-footer
    table-class-name="customize-table master-header"
    @update-sort="sortBy = $event.sortBy; sortType = $event.sortType"
  >

          <template #header-alert.labels.severity="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
        
              <template v-slot:default="{ isActive }">
            
                  <v-select autofocus=true @keyup.enter="isActive.value=false" menu-icon="mdi-arrow-left-bold-circle" 
                      clearable=true @update:menu="isActive.value=false"  bg-color="white" 
                      label="Severity" menu density=compact multiple :items="logTypes" v-model="searchSeverity" @update:modelValue="this.setQueryString();">
                  </v-select>
          
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchSeverity != null && searchSeverity.length > 0" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>                
                <v-icon color="#999" v-if="searchSeverity == null || searchSeverity.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>
            
            <div>Severity</div>
          </template>

          <template #header-alert.labels.gm_instance="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
        
              <template v-slot:default="{ isActive }">
            
                  <v-select autofocus=true @keyup.enter="isActive.value=false" menu-icon="mdi-arrow-left-bold-circle" 
                      clearable=true @update:menu="isActive.value=false"  bg-color="white" 
                      label="GM" menu density=compact multiple :items="gmInstances" v-model="searchGmInstance" @update:modelValue="this.setQueryString();">
                  </v-select>
          
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchGmInstance != null && searchGmInstance.length > 0" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>              
                <v-icon color="#999" v-if="searchGmInstance == null || searchGmInstance.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>
            
            <div>GM</div>
          </template>

          <template #header-alert.labels.alertname="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
              <template v-slot:default="{ isActive }">
                <v-text-field label="AlertName" @keyup.enter="isActive.value=false" clearable=true 
                    autofocus=true density=compact bg-color="white"  v-model="searchAlertName" @update:modelValue="this.setQueryString();">
                  <template v-slot:append-inner>
                    <v-icon @click="isActive.value=false">mdi-arrow-right-bold-circle</v-icon>
                  </template>
                </v-text-field>
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchAlertName != null && !searchAlertName.includes(',') && searchAlertName.length > 0 && !searchAlertName.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>
                <v-icon color="red" v-if="searchAlertName != null && !searchAlertName.includes(',') && searchAlertName.length > 0 && searchAlertName.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-remove</v-icon>
                <v-icon color="blue" v-if="searchAlertName != null && searchAlertName.includes(',')" 
                    v-bind="activatorProps">mdi-filter-plus</v-icon>                    
                <v-icon color="#999" v-if="searchAlertName == null || searchAlertName.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>
            
            <div>AlertName</div>
          </template>

          <template #header-alert.labels.instance="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
              <template v-slot:default="{ isActive }">
                <v-text-field label="Instances" @keyup.enter="isActive.value=false" clearable=true 
                    autofocus=true density=compact bg-color="white"  v-model="searchInstance" @update:modelValue="this.setQueryString();">
                  <template v-slot:append-inner>
                     <v-icon @click="isActive.value=false">mdi-arrow-right-bold-circle</v-icon>
                  </template>
                </v-text-field>
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchInstance != null && !searchInstance.includes(',') && searchInstance.length > 0 && !searchInstance.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>
                <v-icon color="red" v-if="searchInstance != null && !searchInstance.includes(',') && searchInstance.length > 0 && searchInstance.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-remove</v-icon>
                <v-icon color="blue" v-if="searchInstance != null && searchInstance.includes(',')" 
                    v-bind="activatorProps">mdi-filter-plus</v-icon>                    
                <v-icon color="#999" v-if="searchInstance == null || searchInstance.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>

            <div>Instances</div>
          </template>

          <template #header-alert.labels.team="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
              <template v-slot:default="{ isActive }">
                <v-text-field label="Team" @keyup.enter="isActive.value=false" clearable=true 
                    autofocus=true density=compact bg-color="white"  v-model="searchTeam" @update:modelValue="this.setQueryString();">
                  <template v-slot:append-inner>
                    <v-icon @click="isActive.value=false">mdi-arrow-right-bold-circle</v-icon>
                  </template>
                </v-text-field>
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchTeam != null && !searchTeam.includes(',') && searchTeam.length > 0 && !searchTeam.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>
                <v-icon color="red" v-if="searchTeam != null && !searchTeam.includes(',') && searchTeam.length > 0 && searchTeam.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-remove</v-icon>
                <v-icon color="blue" v-if="searchTeam != null && searchTeam.includes(',')" 
                    v-bind="activatorProps">mdi-filter-plus</v-icon>                    
                <v-icon color="#999" v-if="searchTeam == null || searchTeam.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>
            
            <div>Team</div>
          </template>

          <template #header-alert.annotations.summary="header">
            <v-dialog offset=-40 max-width="300" location-strategy="connected">
              <template v-slot:default="{ isActive }">
                <v-text-field label="Summary" @keyup.enter="isActive.value=false" clearable=true 
                    autofocus=true density=compact bg-color="white"  v-model="searchSummary" @update:modelValue="this.setQueryString();">
                  <template v-slot:append-inner>
                    <v-icon @click="isActive.value=false">mdi-arrow-right-bold-circle</v-icon>
                  </template>
                </v-text-field>
              </template>
              <template v-slot:activator="{ props: activatorProps }">
                <v-icon color="green" v-if="searchSummary != null && !searchSummary.includes(',') && searchSummary.length > 0 && !searchSummary.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-check</v-icon>
                <v-icon color="red" v-if="searchSummary != null && !searchSummary.includes(',') && searchSummary.length > 0 && searchSummary.startsWith('!')" 
                    v-bind="activatorProps">mdi-filter-remove</v-icon>
                <v-icon color="blue" v-if="searchSummary != null && searchSummary.includes(',')" 
                    v-bind="activatorProps">mdi-filter-plus</v-icon>                    
                <v-icon color="#999" v-if="searchSummary == null || searchSummary.length == 0" v-bind="activatorProps">mdi-filter-off</v-icon>
              </template>
            </v-dialog>
            
            <div>Summary</div>
          </template>

  </EasyDataTable>

  <v-expansion-panels v-model="panel" multiple flat class="group-panels">
    <template v-for="group, key in info" :key="key">
    <v-expansion-panel v-if="groupStats[key] && groupStats[key].total > 0" :value="key" bg-color="transparent" elevation="0">
      <v-expansion-panel-title class="group-header" hide-actions>
        <template v-slot:default="{ expanded }">
            <v-icon size="small" class="group-chevron" :class="{ 'group-chevron--open': expanded }">mdi-chevron-right</v-icon>
            <span class="group-title">
              <template v-if="key == 'ALL'">Ungrouped</template>
              <template v-else>{{ groupTitle(key) }}</template>
            </span>
            <v-spacer></v-spacer>
            <v-chip v-if="groupStats[key].newCount > 0" size="x-small" label variant="flat" color="red" class="mr-2" prepend-icon="mdi-alert-decagram">
              {{ groupStats[key].newCount }} new
            </v-chip>
            <v-chip v-if="groupStats[key].staleCount > 0" size="x-small" label variant="flat" color="blue-grey" class="mr-2" prepend-icon="mdi-clock-alert">
              {{ groupStats[key].staleCount }} stale
            </v-chip>
            <v-chip v-if="groupStats[key].firingFor != null" size="x-small" label variant="tonal" color="orange" class="mr-2" prepend-icon="mdi-clock-outline">
              firing for {{ groupStats[key].firingFor }}
            </v-chip>
            <v-chip size="x-small" label variant="tonal" :color="groupStats[key].firing > 0 ? 'red' : 'green'">
              {{ groupStats[key].firing }}/{{ groupStats[key].total }} firing
            </v-chip>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text >
        <EasyDataTable
          ref="dataTable"
          :key="'tbl-' + key + '-' + sortBy + '-' + sortType"
          :headers="headers"
          :items="group.list"
          :loading="loading"
          :sort-by="sortBy"
          :sort-type="sortType"
          hide-header
          :rows-items=[1,5,15,25,50,100]
          :table-min-height=10
          :hide-footer="group.list.length <= this.rowsPerPage"
          :rows-per-page="this.rowsPerPage"
          :filter-options="filterOptions"
          :body-row-class-name="bodyRowClassName"
          table-class-name="customize-table"
        >


          <!-- ITEMS -->

          <template #item-alert.annotations.summary="item">
            <div style="max-height: 65px;" v-html="getSummaryHeader(item.alert.labels.alertname, item.alert.annotations.summary)">
            </div>
            <div v-if="showExtraLabels && getExtraLabels(item).length > 0" style="display: flex; flex-wrap: wrap; gap: 4px; margin: 3px 0 5px 0;">
              <v-chip v-for="tag in getExtraLabels(item)" :key="tag.key" size="x-small" label variant="tonal" :color="getLabelColor(tag.key)">
                <span style="font-weight: 600;">{{ tag.key }}</span>:&nbsp;{{ tag.value }}
              </v-chip>
            </div>
          </template>

          <template #item-alert.startsAt="item">
            <div style="text-align: center;"><v-chip size="small" :color="getLastOccColor(item)">{{ item.duration }}</v-chip></div>
          </template>

          <template #item-icon="item">
            <div style="border: 0; display: flex; align-items: center; gap: 2px;">
              <v-icon v-if="isStale(item)" size="24" color="blue-grey-darken-1" class="mr-1"
                  title="Alertmanager offline — this alert may be stale">mdi-clock-alert</v-icon>
              <v-progress-circular v-if="item.status == 'NEW' && !isStale(item)" :rotate="0" :size="26" :width="2" bg-color="#ddd"
                  :color="getColorByPercent(Math.round((((new Date(item.alert.endsAt) - new Date()) / 1000)) / 300 * 100))"
                  :model-value="Math.round((((new Date(item.alert.endsAt) - new Date()) / 1000)) / 300 * 100)" >
                <template v-slot:default>
                  <v-icon  style="padding-bottom: 2px;" color=red
                      v-if="item.status == 'NEW' && item.flapping != true">mdi-alert-outline</v-icon>
                  <v-icon style="padding-bottom: 0px;" color=red
                      v-if="item.flapping == true">mdi-sync-alert</v-icon>
                </template>
              </v-progress-circular>

              <table v-if="item.status != 'NEW' && !isStale(item)"><tr><td style="padding-left: 3px;">
                  <v-icon color=grey class="pb-0" v-if="item.status == 'SILENCED'">mdi-sleep</v-icon>
                  <v-icon color=orange class="pb-0" v-if="item.status == 'ACKED'">mdi-account-check</v-icon>
                  <v-icon color=green class="pb-0" v-if="item.status == 'RESOLVED'">mdi-checkbox-marked-circle-outline</v-icon>
                  </td><td>
                  <v-icon color=red class="pb-0" v-if="item.flapping == true">mdi-sync-alert</v-icon>
                  </td></tr>
              </table>

              <v-icon v-if="getExtraAnnotations(item).length > 0" size="24" color="#EAB308"
                  class="ml-3" style="cursor: pointer;" title="View annotations"
                  @click="annotationsDialog.item=item; annotationsDialog.dialog=true;">mdi-note-text</v-icon>
            </div>
          </template>

          <template #item-alert.labels.instance="item">
            <div style="text-align: center;">{{ item.alert.labels.instance }}</div>
          </template>

          <template #item-alert.labels.severity="item">
            <div style="text-align: center;"><v-chip size="small" :color="getSeverityColor(item)">{{ item.alert.labels.severity }}</v-chip></div>
          </template>

          <template #item-alert.labels.alertname="item">
            <div v-if="item.alert.labels.service != null" style="padding-left: 4px; border-left: 3px solid orange; text-align: center;">
              {{ item.alert.labels.service }}
            </div>
            <div v-if="item.alert.labels.service == null" style="text-align: center;">
              {{ item.alert.labels.alertname }}
            </div>
          </template>

          <template #item-alert.labels.team="item">
            <div v-if="item.alert.labels.team != null" style="text-align: center;">
              {{ item.alert.labels.team }}
            </div>
            <div size="small" color="red" v-if="(item.alert.labels.team == null)" style="padding-left: 4px; border-left: 3px solid red; text-align: center;">
              TEAM MISSING
            </div>
          </template>



          <template #item-alert.labels.gm_instance="item">
            <div v-if="item.alert.labels.gm_instance != null && item.alert.annotations.gm_instance_from_am == null" style="text-align: center;">
              {{item.alert.labels.gm_instance}}
            </div>
            <div v-if="item.alert.labels.gm_instance != null && item.alert.annotations.gm_instance_from_am == 'true'"
                style="padding-left: 4px; border-left: 3px solid orange; text-align: center;">
              {{item.alert.labels.gm_instance}}
            </div>
            <div v-if="item.alert.labels.gm_instance == null"
                style="padding-left: 4px; border-left: 3px solid red; text-align: center;">
              legacy
            </div>
          </template>


          <template #item-actions="item">
            <v-menu offset-y>
              <template v-slot:activator="{ props }">
                <v-icon small v-bind="props">mdi-dots-vertical</v-icon>
              </template>
              <v-card><v-list>
                    <v-list-item>
                      <v-btn
                        value="DETAILS"
                        small
                        style="width: 75px;"
                        color="purple"
                        elevation=0
                        @click="alertDetails.dialog=true;alertDetails.item=item;"
                      >DETAILS</v-btn>
                    </v-list-item>
                <v-list-item v-if="item.status == 'NEW'" >
                      <v-btn 
                        value="ACK"
                        small
                        style="width: 75px;"
                        color="green" 
                        elevation=0
                        @click="mark(item, 'ACKED')"
                      >ACK</v-btn>
                    </v-list-item>
                    <v-list-item v-if="item.status == 'ACKED'">
                      <v-btn  
                        value="UNACK"
                        small
                        style="width: 75px;color:white !important"
                        color="blue-lighten-2"
                        elevation=0
                        @click="mark(item, 'NEW')"
                      >UNACK</v-btn>
                    </v-list-item>
                    <v-list-item v-if="item.status == 'RESOLVED'"> 
                      <v-btn  
                        value="DELETE"
                          small
                          style="width: 75px;"
                          color="red"
                          elevation=0
                          @click="deleteRecord(item.id);"
                        >DELETE</v-btn>
                      </v-list-item>
                      <v-list-item v-if="item.status != 'RESOLVED'" >
                        <v-btn 
                          value="SILENCE"
                          small
                          style="width: 75px;"
                          color="red"
                          elevation=0
                          @click="newSilence(item);silence.dialog = true;"
                        >SILENCE</v-btn>
                      </v-list-item>
                      <v-list-item v-if="item.status != 'RESOLVED'" >
                        <v-btn 
                          value="JIRA"
                          small
                          style="width: 75px;"
                          color="blue"
                          elevation=0
                          @click="newJira(item);jira.dialog = true;"
                        >JIRA</v-btn>
                      </v-list-item>
                      <v-list-item>
                        <v-btn
                          value="NOTE"
                          small
                          style="width: 75px;"
                          color="yellow"
                          elevation=0
                          @click="note.dialog = true;note.id = item.id;note.message='';note.prefix='Note';note.caption='Add a note to the record';"
                        >NOTE</v-btn>
                      </v-list-item>
                      
                  </v-list>
                </v-card>
            </v-menu>
          </template>

        </EasyDataTable>
      </v-expansion-panel-text>
    </v-expansion-panel>
    </template>

  </v-expansion-panels>

</template>


<script src="./ResultListModel.js"/>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
/* Center the header label for columns whose body cells are centered.
   EasyDataTable's header-text-direction is table-wide, so we target
   just these columns via a per-column class instead. */
:deep(th.center-header .header) {
  justify-content: center !important;
}
:deep(th.center-header .header > div) {
  text-align: center;
}

/* Group headers styled as clean, modern expandable rows instead of
   stacked grey blocks. */
.group-panels {
  gap: 4px;
}
:deep(.group-panels .v-expansion-panel) {
  background: transparent;
  margin-top: 4px;
}
:deep(.group-panels .v-expansion-panel::after) {
  border: none;
}
:deep(.group-header) {
  min-height: 36px !important;
  padding: 4px 12px !important;
  background: #f8fafc;
  border: 1px solid #e5e9f0;
  border-radius: 6px;
  transition: background 0.15s ease, border-color 0.15s ease;
}
:deep(.group-header:hover) {
  background: #eef2f7;
}
:deep(.v-expansion-panel-title--active.group-header) {
  background: #eef2ff;
  border-color: #c7d2fe;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.group-chevron {
  color: #64748b;
  margin-right: 8px;
  transition: transform 0.2s ease;
}
.group-chevron--open {
  transform: rotate(90deg);
}
.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}
</style>
