console.log('함수 준비');

function publish(snsParams, publishCB) {
  var AWS = require('aws-sdk');
  AWS.config.update({
    region: "us-east-1",
    endpoint: "sns.us-east-1.amazonaws.com"
  });
  var sns = new AWS.SNS({
    apiVersion: '2010-03-31'
  });
  sns.publish(snsParams, function(err, data) {
    if (err) {
      publishCB(err);
    } else {
      publishCB(null, "SNS 전송 성공");
    }
  });
}

exports.handler = function(event, context, callback) {
  event.Records.forEach(function(record) {
    var snsTopicArn = "arn:aws:sns:us-east-1:123456789:myHTTPSns";
    // base63로 인코딩된 Kinesis 데이터를 복호화해야 한다.
    var payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
    console.log("복호화한 오류 로그 : ", payload);
    console.log("SNS 주제 전송 - xyz@email.com로 메일을 보낸다.");
    var snsParams = {
      Message: payload,
      /* required */
      Subject: 'HTTP Error',
      TopicArn: snsTopicArn
    };
    publish(snsParams, function(snsErr, snsVal) {
      if (snsErr) {
        console.log("SNS 알림 전송 오류 : ", snsErr);
        callback(snsErr);
      } else {
        console.log(snsVal);
        callback(null, snsVal);
      }
    });
  });
};
