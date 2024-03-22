/* eslint-disable prettier/prettier */
<template>
  <v-app-bar 
    color="purple-lighten-5"
    density="compact"
    dark
    flat
  >    
    <v-icon size="x-large" v-if="showDrawer==false" @click="toggleDrawer();">mdi-menu-right</v-icon>
    <v-icon size="x-large" v-if="showDrawer==true" @click="toggleDrawer();">mdi-menu-left</v-icon>
    <div style="font-synthesis-small-caps: auto; font-size: x-small; color: purple">FILTERS</div>

    <v-spacer></v-spacer>
    

    <div class="mt-6 mr-9" >
      <v-switch v-model="autoRefresh" label="auto-refresh" density="compact"></v-switch>
    </div>

    <v-btn class="mt-0" tile @click="fetchData()" target="_blank" text :color="refreshStyle">
      Refresh
      <v-icon>mdi-database-refresh</v-icon>
    </v-btn>

    <v-btn class="mt-0" tile @click.stop="fetchData(true)" target="_blank" text>
      <div >
        Export
        <v-icon>mdi-application-export</v-icon>
      </div>
    </v-btn>
  </v-app-bar>

    
  <!-- DRAWER -->

  <v-navigation-drawer v-model="showDrawer" app color="purple-lighten-5">
    <div class="px-2 mt-0">
      <v-btn width=250 height=50 @click="searchValue='';searchGmInstance=[];panel=[];groupField=null;searchSeverity=[];gmInstances =[];statuses=[]" target="_blank" text style="background-color:rgba(0, 0, 0, 0.04);">
        <span class="mr-2">Clear</span>
        <v-icon>mdi-notification-clear-all</v-icon>
      </v-btn>
    </div>
    
    <div class="pa-2 mt-0 mb-0"><table style="width: 100%"><tr>
      <td v-if="groupField != null" style="width: 30px"><v-icon @click="groupField=null;panel=[];fetchData();">mdi-broom</v-icon></td>
        <v-select style="max-height: 50px" :items="allFields" v-model="groupField" label="Group by Field"></v-select>
      <td></td></tr></table>
    </div>
    
    
    <div class="pa-2 mt-0 mb-0">
        <v-select style="max-height: 50px" multiple :items="logTypes" v-model="searchSeverity" label="Severity"></v-select>
    </div>

    <div class="pa-2 mt-0 mb-0">
      <v-select style="max-height: 50px" multiple :items="gmInstances" v-model="searchGmInstance" label="GM Instance"></v-select>
    </div>

    <div class="pa-2" >
      <v-card class="px-2" style="background-color:rgba(0, 0, 0, 0.04);" >
        <v-card-title style="max-height: 45px" class="caption">Status</v-card-title>
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="FIRING" value="NEW" append-icon="mdi-bell-ring"></v-checkbox>
          
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="ACKED" value="ACKED" append-icon="mdi-account-check"></v-checkbox>
          <v-checkbox style="max-height: 45px" hide-details dense v-model="statuses" label="RESOLVED" value="RESOLVED" append-icon="mdi-checkbox-marked-circle-outline"></v-checkbox>
          <v-checkbox style="margin-bottom: 10px; max-height: 45px" hide-details dense v-model="statuses" label="SILENCED" value="SILENCED" append-icon="mdi-sleep"></v-checkbox>
          
      </v-card>

      <v-card class="mt-2 px-2" style="background-color:rgba(0, 0, 0, 0.04);" >
        <v-card-title style="max-height: 45px" class="caption">Attributes</v-card-title>
        <v-checkbox style="margin-bottom: 10px; max-height: 45px" hide-details dense v-model="statuses" label="FLAPPING" value="FLAPPING" append-icon="mdi-swap-vertical"></v-checkbox>
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


  <v-expansion-panels v-model="panel" multiple>
    <v-expansion-panel v-for="list, key in info" :value="key">
      <v-expansion-panel-title style="min-height: 18px; height: 18px; border-bottom: 1px solid #aaa; background-color: #eee;">
        <template v-slot:default="{ expanded }">

            <div v-if="key == 'ALL'">
              All Records (No Group Filter)
            </div>
            <div v-if="key != 'ALL'">
            {{key}}
            </div>

        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text >
        <EasyDataTable
          :headers="headers"
          :items="list"
          :loading="loading"
          :sort-by="sortBy"
          :sort-type="sortType"
          :search-value="searchValue"
          :search-field="searchField"
          table-min-height="10"
          table-class-name="customize-table"
        
        >
        
          <template #item-alert.annotations.summary="item">
            <div style="max-height: 65px;" v-html="getSummaryHeader(item.alert.labels.alertname, item.alert.annotations.summary)">
            </div>

          </template>

          <template #expand="item">
            <div style="border-left: 3px solid #CCC; padding-left: 5px; margin-left: 20px; font-size: 12px; font-weight: bold">{{item.alert.labels.alertname}}: </div>
            <div style="border-left: 3px solid #CCC; padding-left: 5px; margin-left: 20px; font-size: 12px; vertical-align: top; white-space: pre-wrap;" v-html="item.alert.annotations.summary"></div>
              
          </template>


          <template #item-alert.startsAt="item">
            <div ><v-chip size="small" :color="getLastOccColor(item)">{{ item.duration }}</v-chip></div>
          </template>

          <template #item-alert.labels.severity="item">
            <div ><v-chip size="small" :color="getSeverityColor(item)">{{ item.alert.labels.severity }}</v-chip></div>
          </template>

          <template #item-alert.labels.alertname="item">
            <div v-if="item.alert.labels.service != null" style="padding-left: 4px; border-left: 3px solid orange"> 
              {{ item.alert.labels.service }}
            </div>
            <div v-if="item.alert.labels.service == null">
              {{ item.alert.labels.alertname }}
            </div>
          </template>

          <template #item-alert.labels.team="item">
            <div v-if="item.alert.labels.team != null">
              {{ item.alert.labels.team }}
            </div>
            <div size="small" color="red" v-if="(item.alert.labels.team == null)" style="padding-left: 4px; border-left: 3px solid red">
              TEAM MISSING
            </div>
          </template>    


          <template #header-alert.labels.instance="header">
            <div style="margin-top: 8px; width: 75px;">
              <v-row no-gutters align-content="start" justify="start">
              <v-col cols=8>
                {{header.text}}
              </v-col>  
              <v-col cols=4>
              <v-img
                height="25"
                x-small
                elevation="0"
              >
                <v-icon v-if="searchValue != ''" color=blue x-small>mdi-magnify</v-icon>
              </v-img>
              </v-col></v-row>
            </div>
          </template>
          
          <template #header-alert.labels.alertname="header">
            <div style="margin-top: 8px; width: 85px;">
              <v-row no-gutters align-content="start" justify="start">
              <v-col cols=8>
                {{header.text}}
              </v-col>  
              <v-col cols=4>
              <v-img
                height="25"
                x-small
                elevation="0"
              >
                <v-icon v-if="searchValue != ''" color=blue x-small>mdi-magnify</v-icon>
              </v-img>
              </v-col></v-row>
            </div>
          </template>    

          <template #header-alert.annotations.summary="header">
            <div style="margin-top: 8px; width: 85px;">
              <v-row no-gutters align-content="start" justify="start">
              <v-col cols=8>
                {{header.text}}
              </v-col>  
              <v-col cols=4>
              <v-img
                height="25"
                x-small
                elevation="0"
              >
                <v-icon v-if="searchValue != ''" color=blue x-small>mdi-magnify</v-icon>
              </v-img>
              </v-col></v-row>
            </div>
          </template>   

          <template #header-alert.labels.team="header">
            <div style="margin-top: 8px; width: 60px;">
              <v-row no-gutters align-content="start" justify="start">
              <v-col cols=8>
                {{header.text}}
              </v-col>  
              <v-col cols=4>
              <v-img
                height="25"
                x-small
                elevation="0"
              >
                <v-icon v-if="searchValue != ''" color=blue x-small>mdi-magnify</v-icon>
              </v-img>
              </v-col></v-row>
            </div>
          </template>   


          <template #item-icon="item">
            <table><tr><td>
            <v-icon color=red class="pb-0" @click="alertDetails.dialog=true;alertDetails.item=item;" v-if="item.status == 'NEW'">mdi-bell-ring</v-icon> 
            <v-icon color=grey class="pb-0" @click="alertDetails.dialog=true;alertDetails.item=item;" v-if="item.status == 'SILENCED'">mdi-sleep</v-icon> 
            <v-icon color=orange class="pb-0" @click="alertDetails.dialog=true;alertDetails.item=item;" v-if="item.status == 'ACKED'">mdi-account-check</v-icon> 
            <v-icon color=green class="pb-0" @click="alertDetails.dialog=true;alertDetails.item=item;" v-if="item.status == 'RESOLVED'">mdi-checkbox-marked-circle-outline</v-icon> 
            </td><td>
            <v-icon color=red class="pb-0" v-if="item.flapping == true">mdi-swap-vertical</v-icon> 
            </td></tr></table>
          </template>

          <template #item-alert.labels.gm_instance="item">
            <div v-if="item.alert.labels.gm_instance != null && item.alert.annotations.gm_instance_from_am == null">
              {{item.alert.labels.gm_instance}}
            </div>
            <div v-if="item.alert.labels.gm_instance != null && item.alert.annotations.gm_instance_from_am == 'true'" 
                style="padding-left: 4px; border-left: 3px solid orange">
              {{item.alert.labels.gm_instance}}
            </div>
            <div v-if="item.alert.labels.gm_instance == null" 
                style="padding-left: 4px; border-left: 3px solid red">
              legacy
            </div>
          </template>


          <template #item-actions="item">
            <v-menu offset-y>
              <template v-slot:activator="{ props }">
                <v-icon small v-bind="props">mdi-dots-vertical</v-icon>
              </template>
              <v-card><v-list>
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
</style>
