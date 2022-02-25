console.log('함수 준비');
exports.handler = function(event, context, callback) {
  var csvExport = require('dynamodbexportcsv');
  var exporter = new csvExport(null, null, 'us-east-1');

  exporter.exportTable('LambdaExportToS3', ['userName'], 1, true, 250, 'lambda-dynamodb-backup-s3', '04-17-2017', function(err) {
    if (err) {
      console.log("테이블 데이터를 S3로 전송 실패! 오류 : " + err);
      return callback(err);
    }
    console.log("테이블을 S3로 업로드 성공!");
    callback(null, "성공");
  });
};
