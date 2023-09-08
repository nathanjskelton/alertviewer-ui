<template>
  <div class="resultList">
    <ResultList results="This is my results" />
  </div>
</template>

<script>
// @ is an alias to /src
import ResultList from "@/components/ResultList.vue";

export default {
  name: "TheResults",
  components: {
    ResultList
  }
};
</script>
