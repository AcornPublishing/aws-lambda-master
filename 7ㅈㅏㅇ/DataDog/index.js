/*
    지정한 URL에서 받은 응답의 성공 여부를 판별한다.
    성공 응답 -> Datadog에 'gauge' 맞춤 메트릭 값을 1로 보낸다.
    실패 응답 -> Datadog에 'gauge' 맞춤 메트릭 값을 0으로 보낸다..
    사용자 정의 메트릭에는 다음과 같이 표시된다.
    MONITORING|unix_epoch_timestamp|metric_value|metric_type|my.metric.name|#tag1:value,tag2
*/
'use strict';
const request = require('request');
let target = "<웹사이트URL>";
let metric_value, tags;

exports.handler = (event, context, callback) => {
  let unix_epoch_timeshtamp = Math.floor(new Date() / 1000);  // DataDog 사용자 지정 메트릭에 필요한 매개 변수
  let metric_type = "gauge";  // 현재는 gauge 또는 count 유형만 제공된다.
  let my_metric_name = "websiteCheckMetric"; // 사용자 정의 메트릭

  request(target, function (error, response, body) {
    // 성공 응답
    if (!error && response.statusCode === 200) {
      metric_value = 1;
      tags = ['websiteCheck:'+metric_value,'websiteCheck'];
      console.log("MONITORING|" +unix_epoch_timeshtamp+ "|" +metric_value+ "|"+ metric_type +"|"+ my_metric_name+ "|"+ tags.join());
      callback(null, "UP!");
    }
    // 오류 응답
    else {
      console.log("오류 : ",error);
      if (response) {
        console.log(response.statusCode);
      }
      metric_value = 0;
      tags = ['websiteCheck:'+metric_value,'websiteCheck'];
      console.log("MONITORING|" +unix_epoch_timeshtamp+ "|" +metric_value+ "|"+ metric_type +"|"+ my_metric_name+ "|"+ tags.join());
      callback(null, "DOWN!");
    }
  });
};
