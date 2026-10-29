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

// AWS アカウント ID とリージョンを決定する。
// 個人用検証では以下の値をデフォルトとして使う。
const awsAccount = process.env.CDK_DEFAULT_ACCOUNT ?? '526034';
const awsRegion = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1';

// S3 バケット名は GitHub Actions の Environment variable BUCKET_NAME と一致させる。
// 個人用の例は `ntcs-wan-s3-practice-wangyu-526034` で固定する。
const bucketName =
  process.env.BUCKET_NAME ??
  app.node.tryGetContext('bucketName') ??
  `ntcs-wan-s3-practice-wangyu-${awsAccount}`;

// S3 バケットを作成するスタックを生成する。
new S3BucketStack(app, 'ScnGitOpsWangyuStack', {
  env: {
    account: awsAccount,
    region: awsRegion,
  },
  environmentName: targetEnv,
  bucketName,
});

app.synth();
