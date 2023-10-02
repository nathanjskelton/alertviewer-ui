import axios from "axios";
import { useRouter, useRoute } from 'vue-router';

export default {
  
  setup() {
    const router = useRouter();
    const query = useRoute().query;
    return {
      router,
      query
    }
  },
  name: "ResultList",
  props: {
    results: String,
  },
  computed: {
    
  },
  data() {
    return {

      currentSilence: {
        matchers: [
            {
                isRegex: true,
                isEqual: true,
                name: null,
                value: null
            }
        ],
        createdBy: "ui",
        startsAt: null,
        comment: null,
        id: null,
        endsAt: null,
        updatedAt: null,
        hours: 1,
        hoursLeft: 1,
        status: {
            state: "active"
        }
      },
      silence: {
        dialog: false,
      },
      silences: [],

      autoRefresh: false,
      statuses: ['NEW'],
      sessionId: null,
      logTypes: [],
      gmInstances: [],
      searchSeverity: [],
      searchGmInstance: [],
      search: "",
      regexSuggestion: "",
      regexAlreadyExists: false,
      showDrawer: true,
      refreshStyle: "",
      dialog: false,
      copyDialog: {
        dialog: false,
        title: "",
        text: ""
      },
      note: {
        dialog: false,
        id: null,
        message: null,
        caption: "Add a note to the record",
        prefix: "Note"
      },
 
      editItem: {
        id: null,
        message: null,
        dialog: false
      },
      combineDisabled: true,
      mergeDisabled: true,
      deleteDisabled: true,
      name: "Log Entries",
      selected: [],
      expanded: [],
      headers: [
        {
          key: "icon",
          title: "",
          align: "center",
          sortable: true,
          value: "",
          filterable: false,
          width: 50
        },
        {
          key: "duration",
          title: "Duration",
          align: "center",
          sortable: true,
          value: "alert.startsAt",
          filterable: false,
          width: 120
        },
        {
          key: "severity",
          title: "Severity",
          align: "center",
          sortable: true,
          value: "alert.labels.severity",
          filterable: true,
          width:120 
        },
        {
          key: "gminstance",
          title: "GM Instance",
          align: "center",
          sortable: true,
          value: "alert.labels.gm_instance",
          filterable: false,
          width:125
        },
        {
          key: "system",
          title: "System",
          align: "center",
          sortable: true,
          value: "alert.labels.system",
          filterable: true,
          width:125
        },
        {
          key: "service",
          title: "Service",
          align: "center",
          sortable: true,
          value: "alert.annotations.service",
          filterable: true,
          width:125
        },
        {
          key: "instance",
          title: "Instance",
          align: "center",
          sortable: true,
          value: "alert.labels.instance",
          filterable: true,
          width:125
        },
        {
          key: "message",
          title: "Message",
          align: "start",
          sortable: true,
          value: "alert.labels.alertname",
          filterable: true,
        },
        {
          key: "actions",
          title: "",
          align: "start",
          sortable: false,
          value: "actions",
          width: 50,
          filterable: false
        }
      ],
      loading: true,
      info: []
    };
  },
  watch: {
    statuses: {
      handler() {

        if (this.statuses == null || this.statuses.length == 0) {
          this.statuses.push('NEW');
        }

        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },
    searchSeverity: {
      handler() {
        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },
    searchGmInstance: {
      handler() {
        if (this.autoRefresh) {
          this.fetchData();
        } else {
          this.refreshStyle = "orange";
        }
      }
    },    
    dialog: {
      handler() {
        if (this.dialog) {
          //console.log("dialog was open");
        }
      },
      deep: true
    }
  },
  mounted() {
    setTimeout(() => {
      console.log("*** ALERTS TIMEOUT FIRED ***")
    
      if (this.query.type != null && Array.isArray(this.query.type)) {
        this.searchSeverity = this.query.type;
      } else if (this.query.type) {
        this.searchSeverity = [ this.query.type ];
      }

      if (this.query.gmInstances != null && Array.isArray(this.query.gmInstances)) {
        this.searchGmInstance = this.query.gmInstances;
      } else if (this.query.gmInstances) {
        this.searchGmInstance = [ this.query.gmInstances ];
      }

      if (this.query.statuses != null && Array.isArray(this.query.statuses)) {
        this.statuses = this.query.statuses;
      } else if (this.query.statuses) {
        this.statuses = [ this.query.statuses ];
      }
      
      this.poll();
      this.fetchData();
    }, 1000);

    setInterval(() => {
      this.poll();
    }, 5000);

    setInterval(() => {
      this.autoFetchData();
    }, 15000);

  },
 
  methods: {
    //TEST
    genRandomIndex (length) {
      return Math.ceil(Math.random() * (length - 1))
    },

    //END TEST

    customSort(a, b) {
        console.log("a="+a);
        console.log("b="+b);
    },
    getSummaryHeader(summary) {
        return (""+summary).split('\n')[0];
    },
    autoFetchData() {
      if (this.autoRefresh) { this.fetchData(); }
    },
    poll() {
      console.log("POLLING: "+this.baseUrl)
      axios
        .get(this.baseUrl + "poll?sessionId=" + this.sessionId)
        .then(response => {
          this.sessionId = response.data.payload.sessionId;
          this.$emit("alerts", response.data.payload.messageStack);
          this.$emit("status", response.data.payload.statusMessage);
          if (response.data.payload.dataStale) {
            this.refreshStyle = "red lighten-1";
          }

        })
        .catch(error => {
          this.handleError(error);
        });
    },
    toggleDrawer() {
      if (this.showDrawer == false) {
        this.showDrawer = true;
      } else {
        this.showDrawer = false;
      }
    },
    getTimeSince(item) {
      let date1 = new Date(item.lastOccurence);
      let dateNow = new Date();
      let days = Math.trunc((dateNow - date1) / (1000 * 3600 * 24));
      let hours = Math.trunc((dateNow - date1) / (1000 * 3600));
      let minutes = Math.trunc((dateNow - date1) / (1000 * 60));
      if (hours == 0) {
        return minutes + "m";
      }
      if (hours >= 24) {
        return days + "d";
      }
      return hours + "h";
    },
    getSeverityColor(item) {
      if (item.raw.alert.labels.severity == "critical") {
        return "red lighten-1";
      }
      if (item.raw.alert.labels.severity == "warning") {
        return "yellow";
      }
      return "gray";
    },
    getLastOccColor(item) {
      let color = "gray";
      let date1 = new Date(item.lastOccurence);
      let dateNow = new Date();
      let days = Math.trunc((dateNow - date1) / (1000 * 3600 * 24));
      let hours = Math.trunc((dateNow - date1) / (1000 * 3600));
      if (days == 1) {
        return "yellow";
      }
      if (days == 0) {
        color = "orange";
      }
      if (hours == 0) {
        color = "red lighten-1";
      }
      return color;
    },
    styleItem(item) {
      console.log(item.key);
      return "red-lighten-5";
    },
    itemSelected() {
      setTimeout(() => {
        let hasRegex = false;
        let count = this.selected.length;
        this.selected.forEach(row => {
          if (row.regex) {
            hasRegex = true;
          }
        });
        console.log("hasRegex=" + hasRegex + ", count=" + count);
        if (count == 1) this.deleteDisabled = false;
        else this.deleteDisabled = true;
        if (count > 0 && !hasRegex) {
          this.combineDisabled = false;
          this.mergeDisabled = false;
        } else {
          this.combineDisabled = true;
          this.mergeDisabled = true;
        }
      }, 100);
    },
    handleError(error) {
      this.$emit("alert", error, "error");
      /*
      if (error.response.data.message) {
        this.$emit("alert", error.response.data.message, "error");
      } else if (error.response.data) {
        this.$emit("alert", error.response.data, "error");
      } else {
        this.$emit("alert", error, "error");
      }
      */
    },
    onSuccess(response) {
      if (response && response.data && response.data.message) {
        this.$emit("alert", response.data.message, "success");
      }
    },
    combine() {
      let ids = "";
      let delim = "?";
      this.selected.forEach(row => {
        ids = ids + delim + "ids=" + row.id;
        delim = "&";
      });
      axios
        .get(this.baseUrl + "suggestCombine" + ids)
        .then(response => {
          console.log(response);
          this.regexSuggestion = response.data;
          this.onSuccess(response);
          this.dialog = true;
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    applyRegex() {
      let ids = "";
      let delim = "?";
      this.selected.forEach(row => {
        ids = ids + delim + "ids=" + row.id;
        delim = "&";
      });
      axios
        .post(this.baseUrl + "applyCombine" + ids, this.regexSuggestion, {
          headers: {
            "Content-Type": "text/plain"
          }
        })
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.fetchData();
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    merge() {
      let ids = "";
      let delim = "?";
      this.selected.forEach(row => {
        ids = ids + delim + "ids=" + row.id;
        delim = "&";
      });
      //eslint-disable-next-line no-unused-vars
      axios
        .put(this.baseUrl + "merge" + ids)
        .then(response => {
          this.fetchData();
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    mergeAll() {
      axios
        .put(this.baseUrl + "mergeAll")
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    mark(item, value) {
      console.log("MARK: id=" + item.key + ", status=" + value)
      axios
        .put(this.baseUrl + "mark?id=" + item.key + "&status=" + value)
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
          //console.log("THE STATUS IS "+value);
          //if (value == 'HIDE') {
          //  this.note.id = item.key;
          //  this.note.message = "";
          //  this.note.caption = "Enter a reason for hiding this record";
          //  this.note.prefix = "Hide Record"
          //  this.note.dialog = true;
          //}
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    setTeam(item) {
      setTimeout(() => {
        axios
          .put(this.baseUrl + "team?id=" + item.key + "&teams=" + item.teams)
          .then(response => {
            this.onSuccess(response);
          })
          .catch(error => {
            this.handleError(error);
          });
      }, 100);
    },
    deleteRecord(id) {
      axios
        .delete(this.baseUrl + "delete?id=" + id)
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    resetCount() {
      axios
        .put(this.baseUrl + "resetCount?id=" + this.selected[0].id)
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    save() {
      console.log(this.editItem.message);
      axios
        .post(
          this.baseUrl + "update?id=" + this.edititem.key,
          this.editItem.message,
          {
            headers: {
              "Content-Type": "text/plain"
            }
          }
        )
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.fetchData();
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    saveNote() {
      axios
        .post(this.baseUrl + "note?id=" + this.note.id, this.note.prefix + ": " + this.note.message, {
          headers: {
            "Content-Type": "text/plain"
          }
        })
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    newMatcher() {
      this.currentSilence.matchers.push(
        {
          name: null,
          value: null,
          isEqual: true
        });
    },
    deleteMatcher(name, value) {
      this.currentSilence.matchers = this.currentSilence.matchers.filter( el => (el.name+el.value+"" !== name+value+""));
    },
    toggleMatcher(name, value) {
      var result = this.currentSilence.matchers.find(obj => {
        return obj.name === name && obj.value === value;
      });
      if (result.isEqual == true) {
        result.isEqual = false;
      } else {
        result.isEqual = true;
      }
    },
    newSilence(item) {
      this.currentSilence.comment = "Silence "+item.raw.alert.labels.alertname;
      this.currentSilence.id = null;
      this.currentSilence.createdBy = "ui";
      this.currentSilence.status.state = "active";
      this.currentSilence.matchers = [];
      for (const property in item.raw.alert.labels) {      
        this.currentSilence.matchers.push(
          {
            name: `${property}`,
            value: `${item.raw.alert.labels[property]}`,
            isEqual: true
          });
      }
      this.currentSilence.hours = 24;
    },
    saveSilence() {
      axios
        .post(this.baseUrl + "silence", this.currentSilence)
        //eslint-disable-next-line no-unused-vars
        .then(response => {
          this.onSuccess(response);
        })
        .catch(error => {
          this.handleError(error);
        });
    },
    copyDialogText() {
      let textToCopy = this.$refs.copydialog.$el.querySelector('textarea');
      textToCopy.select()
      document.execCommand('copy');
      this.copyDialog.dialog = false;
      this.copyDialog.text = '';
      this.copyDialog.title = '';
    },
    fetchData(asExport) {
      this.loading = true;
      this.itemSelected();
      this.selected = [];
      this.refreshStyle = "";
      let delim = "?";
      let urlString = this.baseUrl;

      if (asExport) {
        urlString = urlString + "export";
      } else {
        urlString = urlString + "request";
      }

      if (this.statuses != null && this.statuses.length > 0) {
        urlString = urlString + delim + "statuses=" + this.statuses;
        delim = "&";
      }

      if (this.searchSeverity != null && this.searchSeverity.length > 0) {
        urlString = urlString + delim + "severity=" + this.searchSeverity;
        delim = "&";
      }

      if (this.searchGmInstance != null && this.searchGmInstance.length > 0) {
        urlString = urlString + delim + "gminstances=" + this.searchGmInstance;
        delim = "&";
      }
      
      if (asExport) {
        window.open(urlString, "_blank");
        this.loading=false;
      } else {
        console.log("FETCHING: "+urlString)
        axios
          .get(urlString)
          .then(response => {
            console.log(response.data.payload);
            this.payload = response.data.payload;
            this.silences = response.data.payload.silences;
            this.info = response.data.payload.entries;
            this.logTypes = []
            this.payload.severities.forEach(value => {
              this.logTypes.push(value);
            })
            this.gmInstances = []
            this.payload.instances.forEach(value => {
              this.gmInstances.push(value);
            })
            
          
            this.router.push({
              query: {
                severity: this.searchSeverity,
                statuses: this.statuses,
                gminstances: this.searchGmInstance
              }, replace: true
            });
          
          
            this.loading = false;
          })
          .catch(error => {
            console.log(error);
            this.handleError(error);
            this.loading = false;
          })
      }

    }
  }
};
