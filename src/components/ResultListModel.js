import axios from "axios";

export default {
  name: "ResultList",
  props: {
    results: String,
    query: null,
    router: null
  },
  data() {
    return {
      autoRefresh: false,
      statuses: [],
      startDateTime: new Date(Date.now() - 86400000),
      teams: [],
      sessionId: null,
      logTypes: [],
      searchSeverity: [],
      endDateTime: new Date(),
      search: "",
      regexSuggestion: "",
      regexAlreadyExists: false,
      showDates: false,
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
      headers: [
        {
          value: "data-table-expand",
          filterable: false
        },
        /*
        {
          value: "id",
          filterable: true,
          width: 10
        },
        */
        {
          text: "Duration",
          align: "center",
          sortable: true,
          value: "duration",
          filterable: false,
          width: 125
        },
        {
          text: "Severity",
          align: "center",
          sortable: true,
          value: "alert.labels.severity",
          filterable: true,
          width:125
        },
        {
          text: "Message",
          align: "start",
          sortable: true,
          value: "alert.labels.alertname",
          filterable: true,
        },
        {
          text: "Actions",
          align: "start",
          sortable: false,
          value: "actions",
          width: 350,
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
        this.refreshStyle = "orange";
        if (this.statuses.includes("HIDE")) {
          this.showDates = true;
        } else {
          this.showDates = false;
        }
      }
    },
    teams: {
      handler() {
        this.refreshStyle = "orange";
      }
    },
    searchSeverity: {
      handler() {
        this.refreshStyle = "orange";
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
      if (this.query.startDateTime != null)
        this.startDateTime = Date.parse(this.query.startDateTime);
      if (this.query.endDateTime != null)
        this.endDateTime = Date.parse(this.query.endDateTime);

      if (this.query.type != null && Array.isArray(this.query.type)) {
        this.searchSeverity = this.query.type;
      } else if (this.query.type) {
        this.searchSeverity = [ this.query.type ];
      }

      if (this.query.statuses != null && Array.isArray(this.query.statuses)) {
        this.statuses = this.query.statuses;
      } else if (this.query.statuses) {
        this.statuses = [ this.query.statuses ];
      }

      if (this.query.teams != null && Array.isArray(this.query.teams)) {
        this.teams = this.query.teams;
      } else if (this.query.teams) {
        this.teams = [ this.query.teams ];
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
      if (item.alert.labels.severity == "critical") {
        return "red lighten-1";
      }
      if (item.alert.labels.severity == "warning") {
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
      console.log(item.id);
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
      axios
        .put(this.baseUrl + "mark?id=" + item.id + "&status=" + value)
        .then(response => {
          this.onSuccess(response);
          this.fetchData();
          //console.log("THE STATUS IS "+value);
          //if (value == 'HIDE') {
          //  this.note.id = item.id;
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
          .put(this.baseUrl + "team?id=" + item.id + "&teams=" + item.teams)
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
          this.baseUrl + "update?id=" + this.editItem.id,
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
      if (this.teams != null && this.teams.length > 0) {
        urlString = urlString + delim + "teams=" + this.teams;
        delim = "&";
      }

      if (this.startDateTime && this.endDateTime) {
        urlString = urlString + 
            delim + "start=" +
            this.startDateTime.toISOString() +
            delim + "end=" +
            this.endDateTime.toISOString();
        delim = "&";
      }

      if (this.searchSeverity != null && this.searchSeverity.length > 0) {
        urlString = urlString + delim + "type=" + this.searchSeverity;
        delim = "&";
      }
      
      if (asExport) {
        window.open(urlString, "_blank");
        this.loading=false;
      } else {
        axios
          .get(urlString)
          .then(response => {
            this.info = response.data.payload;
            this.info.forEach(value => {
              this.logTypes.push(value.alert.labels.severity);
            })
            if (this.statuses.includes("HIDE")) {
              this.router.replace({
                query: {
                  type: this.searchSeverity,
                  start: this.startDateTime.toISOString(),
                  end: this.endDateTime.toISOString(),
                  statuses: this.statuses,
                  teams: this.teams
                }
              });
            } else {
              this.router.replace({
                query: {
                  type: this.searchSeverity,
                  statuses: this.statuses,
                  teams: this.teams
                }
              });
            }
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
