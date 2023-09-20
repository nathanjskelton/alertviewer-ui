/* eslint-disable prettier/prettier */
<template>
  <v-data-table
    v-model:expanded="expanded"
    :headers="headers"
    :items="info"
    item-value="id"
    show-expand
    :sort-by="[{ key: 'duration', order: 'asc' }, { key: 'message', order: 'asc' }]"
    multi-sort
    :loading="loading"
    :search="search"
    class="elevation-1"
    :item-class="function(item) { 
      if (item.status == 'RESOLVED') return 'green lighten-5';
    }"
  >
    <template v-slot:top>
      <v-dialog max-width="600px" v-model="editItem.dialog">
        <v-card>
          <v-card-text>
            <v-textarea v-model="editItem.message" label="Edit Regular Expression"></v-textarea>
          </v-card-text>
          <v-card-actions>
            <v-btn color="blue-darken-1" text @click="editItem.dialog=false;save();">Apply</v-btn>
            <v-btn color="blue-darken-1" text @click="editItem.dialog=false;"  >Cancel</v-btn>
          </v-card-actions>
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

      <v-navigation-drawer v-model="showDrawer" app>
        <div class="pa-2">
          <v-btn @click="startDateTime=null;endDateTime=null;searchGmInstance=[];searchSeverity=[];gmInstances =[];statuses=[]" target="_blank" text>
            <span class="mr-2">Clear</span>
            <v-icon>mdi-notification-clear-all</v-icon>
          </v-btn>
        </div>
        <div class="pa-2">
          <v-card class="px-2 py-0">
            <v-card-text>
              <v-select multiple :items="logTypes" v-model="searchSeverity" label="Severity"></v-select>
            </v-card-text>
          </v-card>
        </div>

        <div class="pa-2">
          <v-card class="px-2 py-0">
            <v-card-text>
              <v-select multiple :items="gmInstances" v-model="searchGmInstance" label="GM Instance"></v-select>
            </v-card-text>
          </v-card>
        </div>

        <div class="pa-2">
          <v-card class="px-2">
            <v-card-title class="caption">Status</v-card-title>
            <v-card-text>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="NEW" value="NEW"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="ACKED" value="ACKED"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="RESOLVED" value="RESOLVED"></v-checkbox>
              <div v-if="showDates" class="px-2">
                <v-date-picker label="Start Date" v-model="startDateTime"></v-date-picker>
              </div>
              <div v-if="showDates" class="px-2">
                <v-date-picker label="End Date" v-model="endDateTime"></v-date-picker>
              </div>
            </v-card-text>
          </v-card>
        </div>

      </v-navigation-drawer>

      <!--
      <div class="pa-5">
        <v-app-bar app dense>


          <v-container >
            <v-row justify="end" align="center">
              
              <v-col >
                <v-switch class="mt-1"  v-model="autoRefresh"></v-switch>
              </v-col>
              <v-col >
                <v-btn tile @click="fetchData()" target="_blank" text :color="refreshStyle">
                  Query
                  <v-icon>mdi-database-refresh</v-icon>
                </v-btn>
              </v-col>
              <v-col >
                
              </v-col>
              
            </v-row>
          </v-container>
        </v-app-bar>
      


        <v-container fluid class="pa-0">
          <v-row dense>
            <v-col>

            </v-col>
          </v-row>
        </v-container>
      </div>
      -->
      <v-card
          color="grey lighten-4"
          flat
          height="60px"
          tile
        >
          <v-toolbar dense>
            <v-btn color="blue" v-if="showDrawer==false" icon @click="toggleDrawer();">
            <v-icon class="pa-0 ma-0">mdi-arrow-expand-right</v-icon>
          </v-btn>
          <v-btn color="blue" v-if="showDrawer==true" icon @click="toggleDrawer();">
            <v-icon class="pa-0 ma-0">mdi-arrow-expand-left</v-icon>
          </v-btn>
            

            <v-toolbar-title>GM Event Viewer</v-toolbar-title>

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

            <v-btn icon>
              <v-icon>mdi-magnify</v-icon>
              <!--
              <v-text-field
                dense
                v-model="search"
                append-icon="mdi-table-search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>    
              -->          
            </v-btn>

          </v-toolbar>
        </v-card>
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

          <div style="margin-left: 20px; white-space: pre-wrap; "></div>

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
                <v-virtual-scroll :items="item.raw.notes" item-height=200>
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


  
    <template v-slot:[`item.message`]="{ item }">
      <div  @click="
            copyDialog.text = item.raw.alert.annotations.summary;
            copyDialog.title='Message Details';
            copyDialog.dialog = true;" 
          style="cursor: pointer; max-height: 65px; ">
          <v-icon color=red class="pb-0" v-if="item.raw.status == 'NEW'">mdi-new-box</v-icon> 
          <v-icon tooltip="Acked" color=orange class="pb-0" v-if="item.raw.status == 'ACKED'">mdi-account-check</v-icon> 
          <v-icon color=green class="pb-0" v-if="item.raw.status == 'RESOLVED'">mdi-checkbox-marked-circle-outline</v-icon> 
          {{item.raw.alert.labels.alertname}}: {{getSummaryHeader(item.raw.alert.annotations.summary)}}</div>
      
    </template>


    <template v-slot:[`item.actions`]="{ item }">
      <v-container style="cell-padding: 0;">
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn
              x-small
              v-bind="props"
              elevation="0"
            >
              <v-icon x-small>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-container style="border: 1px solid grey; background: white;color: white;cell-padding: 0;">
            <v-row dense>
              <v-col style="max-width: 75px;">
                <v-btn-toggle>
                  <v-btn v-if="item.raw.status == 'NEW'" 
                    value="ACK"
                    small
                    style="width: 75px;"
                    class="green lighten-5"
                    @click="mark(item, 'ACKED')"
                  >ACK</v-btn>
                  <v-btn v-if="item.raw.status == 'ACKED'" 
                    value="UNACK"
                    small
                    style="width: 75px;"
                    class="blue lighten-5"
                    @click="mark(item, 'NEW')"
                  >UNACK</v-btn>
                  <v-btn v-if="item.raw.status == 'RESOLVED'" 
                    value="DELETE"
                    small
                    style="width: 75px;"
                    class="red lighten-5"
                    @click="deleteRecord(item.key);"
                  >DELETE</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col style="max-width: 75px;">
                <v-btn-toggle>
                  <v-btn
                    value="NOTE"
                    small
                    style="width: 75px;"
                    class="yellow lighten-5"
                    @click="note.dialog = true;note.id = item.key;note.message='';note.prefix='Note';note.caption='Add a note to the record';"
                  >NOTE</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-container>
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
