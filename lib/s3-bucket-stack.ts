import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// スタックに渡すプロパティ定義。
// environmentName には対象環境名、bucketName には S3 バケット名を受け取る。
export interface S3BucketStackProps extends cdk.StackProps {
  readonly environmentName: string;
  readonly bucketName: string;
}

// S3 バケットを作成する CDK スタック。
// 既存の CloudFormation で利用していたセキュアな S3 設定を維持する。
export class S3BucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3BucketStackProps) {
    super(scope, id, props);

    // S3 バケットを作成する。
    // HTTPS の強制、公開アクセスの遮断、バージョニング、有効なオブジェクト所有権などを有効にする。
    const bucket = new s3.Bucket(this, 'PracticeBucket', {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // 作成されたバケットの名前を出力する。
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'Created S3 bucket name',
    });

    // 作成されたバケット ARN を出力する。
    new cdk.CfnOutput(this, 'BucketArn', {
      value: bucket.bucketArn,
      description: 'Created S3 bucket ARN',
    });

    // 対象環境名を出力する。
    new cdk.CfnOutput(this, 'Environment', {
      value: props.environmentName,
      description: 'Target environment name',
    });
  }
}
