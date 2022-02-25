'use strict';

console.log('함수 준비');
const aws = require('aws-sdk');
const async = require('async');
const ec2 = new aws.EC2({
  apiVersion: '2016-11-15'
});

let instanceIDs = [];
let volumeIDs = [];

function createImage(instanceID, createImageCB) {
  let date = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  // console.log("AMI name: "+instanceID+'-'+date);
  let createImageParams = {
    InstanceId: instanceID, /* 필수 */
    Name: 'AMI-' + instanceID + '-' + date /* 필수 */
  };
  ec2.createImage(createImageParams, function(createImageErr, createImageData) {
    if (createImageErr) {
      console.log(createImageErr, createImageErr.stack); // 오류 발생
      createImageCB(createImageErr);
    } else {
      console.log("createImageData: ", createImageData); // 성공 응답
      createImageCB(null, "AMI 생성 완료!!");
    }
  });
}

function createSnapShot(volumeID, createSnapShotCB) {
  let createSnapShotParams = {
    VolumeId: volumeID,
    /* 필수 */
    Description: 'Snapshot of volume: ' + volumeID
  };
  ec2.createSnapshot(createSnapShotParams, function(createSnapShotErr, createSnapShotData) {
    if (createSnapShotErr) {
      console.log(createSnapShotErr, createSnapShotErr.stack); // 오류 발생
      createSnapShotCB(createSnapShotErr);
    } else {
      console.log("createSnapShotData: ", createSnapShotData); // 성공 응답
      createSnapShotCB(null, "SnapShot 생성 완료!!");
    }
  });
}

exports.handler = (event, context, callback) => {
  instanceIDs = [];
  volumeIDs = [];

  let describeTagParams = {
    Filters: [{
      Name: "key",
      Values: [
        "backup"
      ]
    }]
  };
  let describeVolParams = {
    Filters: [{
      Name: "attachment.instance-id",
      Values: []
    }]
  };

  ec2.describeTags(describeTagParams, function(describeTagsErr, describeTagsData) {
    if (describeTagsErr) {
      console.log(describeTagsErr, describeTagsErr.stack); // 오류 발생
      callback(describeTagsErr);
    } else {
      console.log("tags : ", JSON.stringify(describeTagsData)); // 성공 응답
      for (let i in describeTagsData.Tags) {
        instanceIDs.push(describeTagsData.Tags[i].ResourceId);
        describeVolParams.Filters[0].Values.push(describeTagsData.Tags[i].ResourceId);
      }
      console.log("instanceIDs : " + instanceIDs);
      console.log("describeVolParams : ", describeVolParams);

      ec2.describeVolumes(describeVolParams, function(describeVolErr, describeVolData) {
        if (describeVolErr) {
          console.log(describeVolErr, describeVolErr.stack); // 오류 발생
          callback(describeVolErr);
        } else {
          console.log("describeVolData:", describeVolData); // 성공 응답
          for (let j in describeVolData.Volumes) {
            volumeIDs.push(describeVolData.Volumes[j].VolumeId);
          }
          console.log("volumeIDs : " + volumeIDs);

          async.parallel({
            one: function(oneCB) {
              async.forEachOf(instanceIDs, function(instanceID, key, imageCB) {
                createImage(instanceID, function(createImageErr, createImageResult) {
                  if (createImageErr) {
                    imageCB(createImageErr);
                  } else {
                    imageCB(null, createImageResult);
                  }
                });
              }, function(imageErr) {
                if (imageErr) {
                  return oneCB(imageErr);
                }
                oneCB(null, "AMIs 생성 완료!");
              });
            },
            two: function(twoCB) {
              async.forEachOf(volumeIDs, function(volumeID, key, volumeCB) {
                //console.log("volumeID in volumeIDs: "+volumeID);
                createSnapShot(volumeID, function(createSnapShotErr, createSnapShotResult) {
                  if (createSnapShotErr) {
                    volumeCB(createSnapShotErr);
                  } else {
                    volumeCB(null, createSnapShotResult);
                  }
                });
              }, function(volumeErr) {
                if (volumeErr) {
                  return twoCB(volumeErr);
                }
                twoCB(null, "스냅숏 생성 완료!");
              });
            }
          }, function(finalErr, finalResults) {
            if (finalErr) {
              callback(finalErr);
            }
            callback(null, "완료!!");
          });
        }
      });
    }
  });
};
