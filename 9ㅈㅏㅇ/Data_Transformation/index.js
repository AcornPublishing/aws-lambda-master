'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const async = require('async');
const s3 = new aws.S3({
  apiVersion: '2006-03-01'
});
const csv = require("csvtojson");
const jsonfile = require('jsonfile');
const fs = require('fs');
const docClient = new aws.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  async.auto({
      download: function(callback) {
        console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
        const bucket = event.Records[0].s3.bucket.name;
        let key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        const downloadParams = {
          Bucket: bucket,
          Key: key
        };

        // 실제 키 이름에서 csv/ 제거
        key = key.replace('csv/', '');
        // 파일은 Lambda의 /tmp 디렉터리에 다운로드된다.
        let csvFile = "/tmp/" + key;
        let file = fs.createWriteStream(csvFile);
        s3.getObject(downloadParams).createReadStream().on('error', function(err) {
          console.log("S3에서 파일을 다운로드 하던 중 오류 발생 : ", err);
          callback(err);
        }).pipe(file);

        file.on('finish', function() {
          file.close(); // close()는 비동기 방식으로 완료 후에 호출된다.
          console.log("다운로드 완료! " + csvFile);
          callback(null, {
            'csvFile': csvFile,
            'bucketName': bucket,
            'key': key
          });
        });

        file.on('error', function(err) {
          console.log("S3에서 Id3 파일을 다운로드 하던 중 오류 발생 : ", err);
          callback(err);
        });
      },
      csvtojson: ['download', function(results, callback) {
        console.log("csvtojson 함수 내부");
        let csvFile = results.download.csvFile;
        csv()
          .fromFile(csvFile)
          .on("end_parsed", function(jsonArrayObj) { // 파싱이 끝나면 결과가 여기에 표시된다.
            console.log(jsonArrayObj);

            // 마지막 파일은 .json 확장자를 갖는다.
            let keyJson = results.download.key.replace(/.csv/i, ".json");
            console.log("Final file: " + keyJson);

            // json 파일을 Lambda 함수의 /tmp 디렉터리에 저장한다.
            let jsonFile = "/tmp/" + keyJson;
            jsonfile.writeFile(jsonFile, jsonArrayObj, function(err) {
              if (err) {
                console.error(err);
                callback(err);
              }
            });
            callback(null, {
              'keyJson': keyJson,
              'jsonFile': jsonFile
            });
          });
      }],
      sendToDynamo: ['download', 'csvtojson', function(results, callback) {
        console.log("sendToDynamo 함수 내부");
        console.log("DynamoDB 에서 데이터를 가져오고 있는 중...");
        fs.readFile(results.csvtojson.jsonFile, function(err, data) {
          if (err) {
            console.log(err);
            return callback(err);
          }
          let obj = JSON.parse(data);
          async.forEachOf(obj, function(obj, key, cb) {
            let params = {
              TableName: process.env.TABLE_NAME,
              Item: {
                "ID": obj.ID,
                "Name": obj.Name,
                "Age": obj.Age
              }
            };
            docClient.put(params, function(err, data) {
              if (err) {
                console.error("추가 불가 : ", data.Name, ". 오류 JSON :", JSON.stringify(err, null, 2));
                cb(err);
              } else {
                console.log("PutItem 성공");
                cb(null, "PutItem 성공");
              }
            });
          }, function(err) {
            if (err) {
              console.log(err);
              callback(err);
            } else {
              callback(null, "완료!!");
            }
          });
        });
      }]
    },
    function(err, results) {
      if (err) {
        console.log("오류 발생!");
      } else {
        console.log(results);
      }
    });
};
