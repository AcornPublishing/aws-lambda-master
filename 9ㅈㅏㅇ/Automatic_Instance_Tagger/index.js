'use strict';

console.log('함수 준비');

const aws = require('aws-sdk');
const async = require('async');
const ec2 = new aws.EC2({
  apiVersion: '2016-11-15'
});

let id = [];
let user, region, detail, eventname, arn, principal, userType, describeParams, i, j, k;

function createTag(tagCB) {
  async.forEachOf(id, function(resourceID, key, cb) {
    var tagParams = {
      Resources: [
        resourceID
      ],
      Tags: [{
          Key: "Owner",
          Value: user
        },
        {
          Key: "PrincipalId",
          Value: principal
        }
      ]
    };
    ec2.createTags(tagParams, function(tagErr, tagData) {
      if (tagErr) {
        console.log("자원에 태그 실패 : " + tagParams.Resources + ". 오류 : " + tagErr); // 오류 발생
        cb(tagErr);
      } else {
        console.log("태그 성공"); // 성공 응답
        cb(null, "태그 성공!");
      }
    });
  }, function(err) {
    if (err) {
      console.log(err);
      tagCB(err);
    } else {
      console.log("태그 완료!");
      tagCB(null, "완료!!");
    }
  });
}

function runInstances(runCB) {
  let items = detail.responseElements.instancesSet.items;
  async.series({
    one: function(oneCB) {
      async.forEachOf(items, function(item, key, cb) {
        id.push(item.instanceId);
        cb(null, "added");
      }, function(err) {
        if (err) {
          console.log(err);
          oneCB(err);
        } else {
          console.log("id : " + id);
          oneCB(null, "완료!!");
        }
      });
    },
    two: function(twoCB) {
      describeParams = {
        InstanceIds: []
      };
      async.forEachOf(id, function(instanceID, key, cb) {
        describeParams.InstanceIds.push(instanceID);
        cb(null, "added");
      }, function(err) {
        if (err) {
          console.log(err);
          twoCB(err);
        } else {
          console.log("describeParams: ", describeParams);
          twoCB(null, "완료!!");
        }
      });
    },
    three: function(threeCB) {
      ec2.describeInstances(describeParams, function(err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
          threeCB(err);
        } else {
          console.log("data: ", JSON.stringify(data)); // successful response
          let reservations = data.Reservations;

          async.forEachOf(reservations, function(reservation, key, resrvCB) {
            console.log("******** forEachOf 내부는 비동기 방식으로 동작한다! *************");
            let instances = reservation.Instances[0];
            console.log("Instances: ", instances);
            // 모든 볼륨 ID를 가져온다.
            let blockdevicemappings = instances.BlockDeviceMappings;
            console.log("blockdevicemappings: ", blockdevicemappings);
            // 모든 ENI ID를 가져온다.
            let networkinterfaces = instances.NetworkInterfaces;
            console.log("networkinterfaces: ", networkinterfaces);

            async.each(blockdevicemappings, function(blockdevicemapping, blockCB) {
              console.log("************** blockdevicemappings는 비동기 방식으로 동작한다! ***********");
              id.push(blockdevicemapping.Ebs.VolumeId);
              console.log("blockdevicemapping ID : " + id);
              blockCB(null, "added");
            }, function(err) {
              if (err) {
                console.log(err);
                resrvCB(err);
              } else {
                //console.log("describeParams: ", describeParams);
                async.each(networkinterfaces, function(networkinterface, netCB) {
                  console.log("******** networkinterfaces는 비동기 방식으로 동작한다! *******");
                  id.push(networkinterface.NetworkInterfaceId);
                  console.log("networkinterface ID : " + id);
                  netCB(null, "added");
                }, function(err) {
                  if (err) {
                    console.log(err);
                    resrvCB(err);
                  } else {
                    //console.log("describeParams: ", describeParams);
                    resrvCB(null, "Done!!");
                  }
                });
                //resrvCB(null, "완료!!");
              }
            });
          }, function(err) {
            if (err) {
              console.log(err);
              threeCB(err);
            } else {
              //console.log("describeParams: ", describeParams);
              threeCB(null, "완료!!");
            }
          });
        }
      });
    }
  }, function(runErr, results) {
    // 결과 : {one: 1, two: 2}
    if (runErr) {
      console.log(runErr);
      runCB(runErr);
    } else {
      console.log("runInstances의 ID : " + id);
      runCB(null, "모든 ID 획득");
    }
  });
}

exports.handler = (event, context, callback) => {
  id = [];
  console.log(JSON.stringify(event));
  try {
    region = event.region;
    detail = event.detail;
    eventname = detail.eventName;
    arn = detail.userIdentity.arn;
    principal = detail.userIdentity.principalId;
    userType = detail.userIdentity.type;

    if (userType === 'IAMUser') {
      user = detail.userIdentity.userName;
    } else {
      user = principal.split(':')[1];
    }

    console.log("principalId: " + principal);
    console.log("region: " + region);
    console.log("eventname: " + eventname);
    console.log("detail: ", JSON.stringify(detail));

    if (!(detail.hasOwnProperty('responseElements'))) {
      console.log("responseElements를 찾을 수 없다!!");
      if (detail.hasOwnProperty('errorCode')) {
        console.log("errorCode: ", detail.errorCode);
      }
      if (detail.hasOwnProperty('errorMessage')) {
        console.log("errorMessage: ", detail.errorMessage);
      }
      return callback("responseElementsfound 없음!!");
    }
  } catch (e) {
    console.log("오류 발생 : ", e);
    return callback(e);
  }

  switch (eventname) {
    case "CreateVolume":
      id.push(detail.responseElements.volumeId);
      console.log("id array: " + id);
      createTag(function(err, result) {
        if (err) {
          callback(err);
        } else {
          callback(null, "태그 완료!!");
        }
      });
      break;

    case "RunInstances":
      runInstances(function(err, result) {
        if (err) {
          callback(err);
        } else {
          createTag(function(createTagErr, createTagResult) {
            if (createTagErr) {
              callback(err);
            } else {
              callback(null, "태그 완료!!");
            }
          });
        }
      });
      break;

    case "CreateImage":
      id.push(detail.responseElements.imageId);
      console.log("id : " + id);
      createTag(function(err, result) {
        if (err) {
          callback(err);
        } else {
          callback(null, "태그 완료!!");
        }
      });
      break;

    case "CreateSnapshot":
      id.push(detail.responseElements.snapshotId);
      console.log("id array: " + id);
      createTag(function(err, result) {
        if (err) {
          callback(err);
        } else {
          callback(null, "태그 완료!!");
        }
      });
      break;

    default:
      console.log("선택된 옵션이 없다!!!");
      callback(null, "선택된 옵션이 없다!!!");
  }
};
