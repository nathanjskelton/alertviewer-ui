/* eslint-disable prettier/prettier */
<template>
  <v-data-table
    :headers="headers"
    :items="info"
    item-key="id"
    show-expand
    single-expand
    :sort-by="['duration', 'alert.labels.alertname']"
    multi-sort
    sort-desc
    :loading="loading"
    :search="search"
    class="elevation-1"
    :item-class="function(item) { 
      if (item.status == 'RESOLVED') return 'grey lighten-3';
    }"
    @item-selected="itemSelected()"
    @toggle-select-all="itemSelected()"
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
          <v-btn @click="startDateTime=null;endDateTime=null;searchSeverity=[];teams=[];statuses=[]" target="_blank" text>
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
          <v-card class="px-2">
            <v-card-title class="caption">Status</v-card-title>
            <v-card-text>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="NEW" value="NEW"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="ACKED" value="ACKED"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="statuses" label="RESOLVED" value="RESOLVED"></v-checkbox>
              <div v-if="showDates" class="px-2">
                <v-datetime-picker label="Start Date" v-model="startDateTime">
                  <p slot="dateIcon">Date</p>
                  <p slot="timeIcon">Time</p>
                </v-datetime-picker>
              </div>
              <div v-if="showDates" class="px-2">
                <v-datetime-picker label="End Date" v-model="endDateTime">
                  <p slot="dateIcon">Date</p>
                  <p slot="timeIcon">Time</p>
                </v-datetime-picker>
              </div>
            </v-card-text>
          </v-card>
        </div>
<!--
        <div class="pa-2">
          <v-card class="px-2">
            <v-card-title class="caption">Teams</v-card-title>
            <v-card-text>
              <v-checkbox class="my-0 py-0" v-model="teams" label="LIVE" value="LIVE"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="teams" label="OPS" value="OPS"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="teams" label="MISSION" value="MISSION"></v-checkbox>
              <v-checkbox class="my-0 py-0" v-model="teams" label="DEV" value="DEV"></v-checkbox>
            </v-card-text>
          </v-card>
        </div>
-->
      </v-navigation-drawer>
      <div class="pa-5">
        <v-app-bar app dense>
          <v-btn color="blue" v-if="showDrawer==false" icon @click="toggleDrawer();">
            <v-icon class="pa-0 ma-0">mdi-arrow-expand-right</v-icon>
          </v-btn>
          <v-btn color="blue" v-if="showDrawer==true" icon @click="toggleDrawer();">
            <v-icon class="pa-0 ma-0">mdi-arrow-expand-left</v-icon>
          </v-btn>

          <h2><nobr>GM Alert Viewer</nobr></h2>
          <v-container fluid>
            <v-row class="mt-3" justify="end">
   
              <span>
                <v-switch class="mt-1"  v-model="autoRefresh"></v-switch>
              </span>
              <span >
                <v-btn   tile @click="fetchData()" target="_blank" text :color="refreshStyle">
                  Query
                  <v-icon>mdi-database-refresh</v-icon>
                </v-btn>
              </span>
              <span>
                <v-btn tile style="border-right: 1px solid black;" @click.stop="fetchData(true)" target="_blank" text>
                  <div class="text-lg-right">
                    Export
                    <v-icon>mdi-application-export</v-icon>
                  </div>
                </v-btn>
              </span>
              
            <!--
              <span>
                <v-btn :disabled="combineDisabled" @click.stop="combine()" target="_blank" text>
                  <span class="mr-2">
                    Combine
                    <v-icon>mdi-format-letter-matches</v-icon>
                  </span>
                </v-btn>
                <v-dialog v-model="dialog" persistent max-width="600px">
                  <v-card v-if="regexAlreadyExists == false">
                    <v-card-title>
                      <span class="headline">Combine</span>
                    </v-card-title>
                    <v-card-text>
                      <v-container>
                        <v-textarea v-model="regexSuggestion"/>
                      </v-container>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer/>
                      <v-btn color="blue-darken-1" text @click="dialog = false">Cancel</v-btn>
                      <v-btn color="blue-darken-1" text @click="dialog = false;applyRegex();">Apply</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </span>
              <span>
                <v-btn :disabled="mergeDisabled" @click="merge()" target="_blank" text>
                  <span>
                    Merge
                    <v-icon>mdi-merge</v-icon>
                  </span>
                </v-btn>
              </span>
              <span>
                <v-btn @click="mergeAll()" target="_blank" text>
                  <div class="text-lg-right">
                    Merge All
                    <v-icon>mdi-merge</v-icon>
                  </div>
                </v-btn>
              </span>
            -->

            <!--
              <span>
                <v-btn
                  :disabled="deleteDisabled"
                  @click.stop="note.dialog = true;note.id = selected[0].id;note.message='';note.prefix='Note';note.caption='Add a note to the record';"
                  target="_blank"
                  text
                >
                  <div class="text-lg-right">
                    Note
                    <v-icon>mdi-note-outline</v-icon>
                  </div>
                </v-btn>
              </span>
            -->
            <!--
              <span>
                <v-btn :disabled="deleteDisabled" @click.stop="resetCount()" target="_blank" text>
                  <div class="text-lg-right">
                    Reset
                    <v-icon>mdi-numeric-3-box-multiple-outline</v-icon>
                  </div>
                </v-btn>
              </span>
            -->
            <!--
              <span>
                <v-btn :disabled="deleteDisabled" @click.stop="deleteRecord()" target="_blank" text>
                  <div class="text-lg-right">
                    Delete
                    <v-icon>mdi-delete</v-icon>
                  </div>
                </v-btn>
              </span>
            -->
            </v-row>
          </v-container>
        </v-app-bar>

        <v-container fluid class="pa-0">
          <v-row dense>
            <v-col>
              <v-text-field
                dense
                v-model="search"
                append-icon="mdi-table-search"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </template>

    <!-- the details drawer -->
    <template v-slot:expanded-item="{ headers, item }">
      <td :colspan="headers.length">
        
        
        <div>
          <span class="ps-5">
            <v-chip color="green lighten-1" x-small>STARTED</v-chip>
            {{ item.friendlyStartTime  }}
          </span>
          <span class="ps-5">
            <v-chip color="red lighten-1" x-small>ENDS</v-chip>
            {{ item.friendlyEndTime }}
          </span>
        </div>

        <div style="margin-left: 20px; white-space: pre-wrap; border-top: 1px dotted black;"></div>

      
        <v-container fluid>
          <v-row dense>
            <v-col cols="4" dense>
              <subtitle-1 class="ma-0 pa-3" style="font-weight: bold;">Message Details</subtitle-1>
            </v-col>
            <v-col dense>
              <subtitle-1 class="ma-0 pa-3" style="font-weight: bold;">Notes</subtitle-1>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="4" class="pt-0 mt-0">
              
              <div style="margin-left: 20px; margin-top: 10px; white-space: pre-wrap;">{{item.alert.annotations.summary}}</div>
                    
            </v-col>
            <v-col class="pt-0 mt-0">
              <v-virtual-scroll :items="item.notes" item-height="42" height="225">
                <template v-slot="{ item }">
                  <v-list-item :key="item">
                    <v-list-item-content>
                      <v-list-item-title>{{item.timestamp}}</v-list-item-title>
                      <v-list-item-subtitle>{{item.message}}</v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-virtual-scroll>
            </v-col>
          </v-row>
        </v-container>
      
      </td>
    </template>

    <!--
    <template v-slot:[`item.id`]="{ item }">
      <div style="display: none">{{item.id}}</div>
          <v-icon
            class="pb-1 my-auto"
            div
            style="cursor:pointer"
            color=blue
            @click="copyDialog.text = '# ' + item.id + '\n```\n' + item.message + '\n```\n';
                copyDialog.title = 'Entry Markdown';
                copyDialog.dialog = true;"
        >mdi-barcode</v-icon>    
    </template>
    -->

    <template v-slot:[`item.duration`]="{ item }">
      <v-chip small :color="getLastOccColor(item)">{{ item.duration }}</v-chip>
    </template>

    <template v-slot:[`item.alert.labels.severity`]="{ item }">
      <v-chip small :color="getSeverityColor(item)">{{ item.alert.labels.severity }}</v-chip>
    </template>

  <!--
    <template v-slot:[`item.regex`]="{ item }">
      <v-icon
        v-if="item.regex"
        class="pb-1 my-auto"
        div
        style="cursor:pointer"
        @click="editItem.message=item.message;editItem.id=item.id;editItem.dialog=true" color=green
      >mdi-fingerprint</v-icon>
      <v-icon
        v-if="!item.regex"
        class="pb-1 my-auto" color=red
        div>mdi-fingerprint-off</v-icon>
    </template>
  -->

  
    <template v-slot:[`item.alert.labels.alertname`]="{ item }">
      <div  @click="
            copyDialog.text = item.alert.annotations.summary;
            copyDialog.title='Message Details';
            copyDialog.dialog = true;" 
          style="cursor: pointer; max-height: 65px; ">
          <v-icon color=blue class="pb-0" v-if="item.status == 'NEW'">mdi-new-box</v-icon> 
          <v-icon color=green class="pb-0" v-if="item.status == 'ACKED'">mdi-account-eye</v-icon> 
          <v-icon color=grey class="pb-0" v-if="item.status == 'RESOLVED'">mdi-history</v-icon> 
          {{item.alert.labels.alertname}}: {{getSummaryHeader(item.alert.annotations.summary)}}</div>
      
    </template>

  

    <template v-slot:[`item.actions`]="{ item }">
      <v-container style="cell-padding: 0;">
        <v-row dense>
          <v-col style="max-width: 75px;">
            <v-btn-toggle v-model="item.status" rounded>
              <v-btn v-if="item.status == 'NEW'" 
                value="ACK"
                x-small
                class="mdi-format-align-left green lighten-5"
                @click="mark(item, 'ACKED')"
              >ACK</v-btn>
              <v-btn v-if="item.status == 'ACKED'" 
                value="UNACK"
                x-small
                class="mdi-format-align-left blue lighten-5"
                @click="mark(item, 'NEW')"
              >UNACK</v-btn>
              <v-btn v-if="item.status == 'RESOLVED'" 
                value="DELETE"
                x-small
                class="mdi-format-align-center red lighten-5"
                @click="deleteRecord(item.id);"
              >DELETE</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col style="max-width: 75px;">
            <v-btn-toggle v-model="item.teams" rounded multiple>
              <v-btn
                value="NOTE"
                x-small
                class="mdi-format-align-center yellow lighten-5"
                @click="note.dialog = true;note.id = item.id;note.message='';note.prefix='Note';note.caption='Add a note to the record';"
              >NOTE</v-btn>

            </v-btn-toggle>
          </v-col>

        </v-row>

        
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
