/* eslint-disable prettier/prettier */
<template>
  <v-app-bar height="40"
    color="purple-lighten-5"
    dense
    dark
    flat
  >

    
    <v-icon size="x-large" v-if="showDrawer==false" @click="toggleDrawer();">mdi-menu-right</v-icon>
    <v-icon size="x-large" v-if="showDrawer==true" @click="toggleDrawer();">mdi-menu-left</v-icon>
    <div style="font-synthesis-small-caps: auto; font-size: x-small; color: purple">FILTERS</div>

    

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
    
  <v-data-table
    density="compact"
    v-model:expanded="expanded"
    :headers="headers"
    :items="info"
    item-value="id"
    show-expand
    :sort-by="[{ key: 'duration', order: 'desc' }, { key: 'message', order: 'asc' }]"
    multi-sort
    :loading="loading"
    :search="search"
    :item-class="function(item) { 
      if (item.status == 'RESOLVED') return 'green lighten-5';
    }"
  >
    <template v-slot:top>
      
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

            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="blue-darken-1" text @click="silence.dialog=false;saveSilence();">Save</v-btn>
            <v-btn color="blue-darken-1" text @click="silence.dialog=false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>


      <v-navigation-drawer v-model="showDrawer" app color="purple-lighten-5">
        <div class="px-2 mt-0">
          <v-btn width=250 height=50 @click="searchGmInstance=[];searchSeverity=[];gmInstances =[];statuses=[]" target="_blank" text style="background-color:rgba(0, 0, 0, 0.04);">
            <span class="mr-2">Clear</span>
            <v-icon>mdi-notification-clear-all</v-icon>
          </v-btn>
        </div>
        <div class="pa-2">
            <v-select multiple :items="logTypes" v-model="searchSeverity" label="Severity"></v-select>
        </div>

        <div class="pa-2">   
            <v-select multiple :items="gmInstances" v-model="searchGmInstance" label="GM Instance"></v-select>
        </div>

        <div class="pa-2" >
          <v-card class="px-2" style="background-color:rgba(0, 0, 0, 0.04);" >
            <v-card-title class="caption">Status</v-card-title>
              <v-checkbox hide-details dense v-model="statuses" label="NEW" value="NEW"></v-checkbox>
              <v-checkbox hide-details dense v-model="statuses" label="ACKED" value="ACKED"></v-checkbox>
              <v-checkbox hide-details dense v-model="statuses" label="RESOLVED" value="RESOLVED"></v-checkbox>
          </v-card>
        </div>
      </v-navigation-drawer>

    
      <v-toolbar dense color="purple-lighten-5" height="50" elevation=3>      
        <v-text-field
          clearable
          clear-icon="mdi-broom"
          dense
          v-model="search"
          label="Search"
          single-line
          hide-details
        ></v-text-field>    
      </v-toolbar>
    </template>




    <template v-slot:expanded-row="{ columns, item }">
      <tr>
        <td style="padding: 5px" :colspan="columns.length">
          <div>
            <span class="ps-5">
              <v-chip color="green lighten-1" x-small>STARTED</v-chip>
              {{ item.raw.friendlyStartTime  }}
            </span>
            <span class="ps-5">
              <v-chip color="red lighten-1" x-small>ENDS</v-chip>
              {{ item.raw.friendlyEndTime }}
            </span>
          </div>

          

          <v-container fluid>
            <v-row >
              <v-col style="padding: 0;" cols="4" offset="0">
                <div style="margin-left: 20px; font-weight: bold;">Message Details</div>
              </v-col>
              <v-col style="padding: 0;">
                <div style="font-weight: bold;">Notes</div>
              </v-col>
            </v-row>
            <v-row>
              <v-col style="padding: 0;" cols="4" >
                <div  style="margin-left: 20px; vertical-align: top; white-space: pre-wrap;">{{item.raw.alert.annotations.summary}}</div>
              </v-col>

              <v-col style="padding: 0;">
                <v-virtual-scroll :items="item.raw.notes" item-height=50 height="200" width="800">
                  <template v-slot="{ item }" >
                    <div style="height: 35px"><v-chip>{{ item.timestamp }}</v-chip><v-chip>{{ item.user }}</v-chip> {{ item.message }} </div>
                  </template>
                </v-virtual-scroll>
              </v-col>

            </v-row>
          </v-container>
        
        </td>
      </tr>
    </template>

    <template v-slot:[`item.duration`]="{ item }">
      <v-chip small :color="getLastOccColor(item)">{{ item.raw.duration }}</v-chip>
    </template>

    <template v-slot:[`item.severity`]="{ item }">
      <v-chip small :color="getSeverityColor(item)">{{ item.raw.alert.labels.severity }}</v-chip>
    </template>

    <template v-slot:[`item.system`]="{ item }">
      <div v-if="item.raw.alert.labels.system != null">
        {{ item.raw.alert.labels.system }}
      </div>
      <v-chip color="red" v-if="(item.raw.alert.labels.system == null) && (item.raw.alert.labels.env != null)">
        {{ item.raw.alert.labels.system }}
      </v-chip>
    </template>    

    <template v-slot:[`item.icon`]="{ item }">
      <v-icon color=red class="pb-0" v-if="item.raw.status == 'NEW'">mdi-new-box</v-icon> 
      <v-icon tooltip="Acked" color=orange class="pb-0" v-if="item.raw.status == 'ACKED'">mdi-account-check</v-icon> 
      <v-icon color=green class="pb-0" v-if="item.raw.status == 'RESOLVED'">mdi-checkbox-marked-circle-outline</v-icon> 
    </template>

  
    <template v-slot:[`item.message`]="{ item }">
      <div @click="copyDialog.text = item.raw.alert.annotations.summary;
            copyDialog.title='Message Details';
            copyDialog.dialog = true;" 
          style="cursor: pointer; max-height: 65px;">
          {{item.raw.alert.labels.alertname}}: {{getSummaryHeader(item.raw.alert.annotations.summary)}}
      </div>
    </template>


    <template v-slot:[`item.actions`]="{ item }">
      <v-container style="cell-padding: 0;">
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn
              height="25"
              x-small
              v-bind="props"
              elevation="0"
            >
              <v-icon x-small>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-card><v-list>
            <v-list-item v-if="item.raw.status == 'NEW'" >
                  <v-btn 
                    value="ACK"
                    small
                    style="width: 75px;"
                    color="green" 
                    elevation=0
                    @click="mark(item, 'ACKED')"
                  >ACK</v-btn>
                </v-list-item>
                <v-list-item v-if="item.raw.status == 'ACKED'">
                  <v-btn  
                    value="UNACK"
                    small
                    style="width: 75px;"
                    color="blue"
                    elevation=0
                    @click="mark(item, 'NEW')"
                  >UNACK</v-btn>
                </v-list-item>
                <v-list-item v-if="item.raw.status == 'RESOLVED'"> 
                  <v-btn  
                    value="DELETE"
                    small
                    style="width: 75px;"
                    color="red"
                    elevation=0
                    @click="deleteRecord(item.key);"
                  >DELETE</v-btn>
                </v-list-item>
                <v-list-item v-if="item.raw.status != 'RESOLVED'" >
                  <v-btn 
                    value="SILENCE"
                    small
                    style="width: 75px;"
                    color="red"
                    elevation=0
                    @click="newSilence(item);silence.dialog = true;"
                  >SILENCE</v-btn>
                </v-list-item>
                <v-list-item>
                  <v-btn
                    value="NOTE"
                    small
                    style="width: 75px;"
                    color="yellow"
                    elevation=0
                    @click="note.dialog = true;note.id = item.key;note.message='';note.prefix='Note';note.caption='Add a note to the record';"
                  >NOTE</v-btn>
                </v-list-item>
                
                </v-list>
                </v-card>
        </v-menu>
      </v-container>
    </template>


  </v-data-table>
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
