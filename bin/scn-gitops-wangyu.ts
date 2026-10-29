#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3BucketStack } from '../lib/s3-bucket-stack';

// CDK アプリケーションのエントリーポイント。
// GitHub Actions の Environment 名、AWS アカウント、リージョン、
// S3 バケット名をまとめて決定し、スタック定義を生成する。
const app = new cdk.App();

// デプロイ先の環境を決定する。
const targetEnv = process.env.TARGET_ENV ?? app.node.tryGetContext('env') ?? 'dev';

// AWS アカウント ID を決定する。
// 誤ったアカウントを前提にデプロイしないよう、12 桁の明示指定を必須とする。
// CDK CLI はローカルの認証情報から CDK_DEFAULT_ACCOUNT を上書きするため、
// 明示指定である --context account=<12桁> を優先する。
const awsAccount = app.node.tryGetContext('account') ?? process.env.CDK_DEFAULT_ACCOUNT;
if (!awsAccount || !/^\d{12}$/.test(awsAccount)) {
  throw new Error(
    'AWS アカウント ID を解決できません。CDK_DEFAULT_ACCOUNT を設定するか、--context account=<12桁> を指定してください。',
  );
}

const awsRegion = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1';

// S3 バケット名は GitHub Actions の Environment variable BUCKET_NAME と一致させる。
// 既定値にも環境名と 12 桁アカウント ID を含め、環境間・既存バケットとの衝突を避ける。
const bucketName =
  process.env.BUCKET_NAME ??
  app.node.tryGetContext('bucketName') ??
  `scn-gitops-wangyu-${targetEnv}-${awsAccount}`;

// S3 バケットを作成するスタックを生成する。
new S3BucketStack(app, 'ScnGitOpsWangyuStack', {
  env: {
    account: awsAccount,
    region: awsRegion,
  },
  // スタック名にも環境名を含め、複数環境が同一スタックを奪い合わないようにする。
  stackName: `scn-gitops-wangyu-${targetEnv}`,
  environmentName: targetEnv,
  bucketName,
});

app.synth();
