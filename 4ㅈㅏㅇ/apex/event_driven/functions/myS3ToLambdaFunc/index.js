// 의존 라이브러리
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm')
  .subClass({
    imageMagick: true
  }); // ImageMagick 통합

var util = require('util');
var s3 = new AWS.S3(); // S3 클라이언트 참조
var transformFunc = process.env.TRANSFORM_FUNC;

exports.handler = function(event, context, callback) {
  // 이벤트 옵션을 읽는다.
  console.log("이벤트 옵션 : \n", util.inspect(event, {
    depth: 5
  }));
  var srcBucket = event.Records[0].s3.bucket.name;
  // 객체의 키에는 스페이스 또는 ASCII 이외에 유니코드 문자가 있을 수 있다.
  var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  var dstBucket = srcBucket + "-output";
  var dstKey = "output-" + srcKey;

  // 소스와 목적지 버킷이 서로 다른지 확인한다.
  if (srcBucket == dstBucket) {
    callback("소스 및 목적지 버킷이 같다!");
    return;
  }

  // 이미지 유형을 추측한다.
  console.log("이미지 유형 찾기");
  var typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    callback("이미지 유형을 알 수 없다.");
    return;
  }
  var imageType = typeMatch[1];
  console.log("예제에서는 간단히 png, jpeg 이미지만 허용한다.");
  if (imageType != "jpg" && imageType != "png") {
    callback('지원하지 않는 이미지 유형 : ${imageType}');
    return;
  }

  // S3에서 이미지를 다운로드한 다음 이미지를 변환해서 다른 S3 버킷으로 업로드한다.
  console.log("S3 이미지 다운로드 -> 이미지 변형 -> png로 변환 -> 이미지 압축 -> 대상 S3 버킷에 저장");

  async.waterfall([
    function download(next) {
      // S3에서 다운로드한 이미지를 버퍼에 저장한다.
      s3.getObject({
          Bucket: srcBucket,
          Key: srcKey
        },
        next);
    },
    function transform(response, next) {
      console.log("세 가지 이미지 변형 : 음영, 투명, 흑백");
      console.log("현재 이미지 변형 옵션 : " + transformFunc + ".");
      switch (transformFunc) {
        case "negative":
          gm(response.Body).negative()
            .toBuffer(imageType, function(err, buffer) {
              if (err) {
                next(err);
              } else {
                next(null, response.ContentType, buffer);
              }
            });
          break;
        case "transparent":
          gm(response.Body).colorspace("transparent")
            .toBuffer(imageType, function(err, buffer) {
              if (err) {
                next(err);
              } else {
                next(null, response.ContentType, buffer);
              }
            });
          break;
        case "gray":
          gm(response.Body).colorspace("gray")
            .toBuffer(imageType, function(err, buffer) {
              if (err) {
                next(err);
              } else {
                next(null, response.ContentType, buffer);
              }
            });
          break;
        default:
          console.log("변형할 이미지 유형이 없음");
          callback("변형할 이미지 유형이 없음");
          return;
      }
    },
    function upload(contentType, data, next) {
      // 변형된 이미지를 다른 S3 버킷에 스트리밍한다.
      s3.putObject({
          Bucket: dstBucket,
          Key: dstKey,
          Body: data,
          ContentType: contentType
        },
        next);
    }
  ], function(err) {
    if (err) {
      console.error(
        srcBucket + '/' + srcKey + '의 이미지 변형에 실패해서 ' +
        dstBucket + '/' + dstKey + '에 업로드 불가! ' +
        '발생한 오류 : ' + err
      );
    } else {
      console.log(
        srcBucket + '/' + srcKey + '의 이미지 변환 후' +
        dstBucket + '/' + dstKey + '에 업로드 성공!'
      );
    }

    callback(null, "메시지");
  });
};
