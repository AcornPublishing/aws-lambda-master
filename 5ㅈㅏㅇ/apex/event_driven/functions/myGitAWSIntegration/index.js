'use strict';

const request = require('request');
const AWS = require('aws-sdk');
const company = process.env.teamworkCompany;
const kmsEncryptedAPIKey = process.env.kmsEncryptedAPIKey;
const taskListID = process.env.taskListID;
let teamworkAPIKey;

function createTask(githubEvent, callback) {
  let taskName = githubEvent.issue.title;
  let path = "/tasklists/" + taskListID + "/tasks.json";
  let date = new Date();
  let month = date.getMonth();
  let day = date.getDate();
  let endDate = date.getFullYear() + ((month + 2) < 10 ? '0' : '') +
    (month + 2) + (day < 10 ? '0' : '') + day;
  let startDate = date.getFullYear() + ((month + 1) < 10 ? '0' : '') +
    (month + 1) + (day < 10 ? '0' : '') + day;

  let base64 = new Buffer(teamworkAPIKey + ":xxx").toString("base64");

  let json = {
    "todo-item": {
      "content": taskName,
      "startdate": startDate,
      "enddate": endDate
    }
  };
  let options = {
    uri: "https://" + company + ".teamwork.com" + path,
    hostname: company + ".teamwork.com",
    method: "POST",
    encoding: "utf8",
    followRedirect: true,
    headers: {
      "Authorization": "BASIC " + base64,
      "Content-Type": "application/json"
    },
    json: json
  };
  request(options, function(error, res, body) {
    if (error) {
      console.error("요청 오류 : " + error);
      callback(error);
    } else {
      console.log("상태 : " + res.statusCode);
      res.setEncoding("utf8");
      console.log("요청 Body : " + body);
      callback(null, "태스크 생성!");
    }
  });
}

exports.handler = function(event, context, callback) {
  let githubEvent = JSON.parse(event.Records[0].Sns.Message);
  console.log('수신한 깃허브 이벤트 :', githubEvent);

  if (!githubEvent.hasOwnProperty('issue') || githubEvent.action !== 'opened') {
    // 이슈 생성을 위한 이벤트가 아닌 경우
    console.log("이슈 생성 이벤트 X!");
    callback(null, "이슈 생성 이벤트 X!");
  } else {
    // 이슈 생성을 위한 이벤트
    console.log("이슈 생성!");

    if (teamworkAPIKey) {
      // Container re-use
      createTask(githubEvent, callback);
    } else if (kmsEncryptedAPIKey && kmsEncryptedAPIKey !== '<kmsEncryptedAPIKey>') {
      const encryptedBuf = new Buffer(kmsEncryptedAPIKey, 'base64');
      const cipherText = {
        CiphertextBlob: encryptedBuf
      };

      const kms = new AWS.KMS();
      kms.decrypt(cipherText, (err, data) => {
        if (err) {
          console.log('복호화 오류 :', err);
          return callback(err);
        }
        teamworkAPIKey = data.Plaintext.toString('ascii');
        createTask(githubEvent, callback);
      });
    } else {
      console.error("API Key가 설정되지 않았음.");
      callback("API Key가 설정되지 않았음.");
    }
  }
};
