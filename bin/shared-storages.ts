#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedStoragesStack } from '../lib/shared-storages-stack';

const app = new cdk.App();
new SharedStoragesStack(app, 'SharedStoragesStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  vpcName: 'AriefhInfraStack/dev-vpc'
});