import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as efs from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs';

interface SharedStoragesStackProps extends cdk.StackProps {
  vpcName: string
}

export class SharedStoragesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedStoragesStackProps) {
    super(scope, id, props);
    const vpc = ec2.Vpc.fromLookup(this, 'dev-vpc', {vpcName: props.vpcName});
    const efsSg = new ec2.SecurityGroup(this, 'efs-root-sg', { vpc: vpc, description: 'Security group used by EFS for root path'});
    efsSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(2049))
    const fileSystem = new efs.FileSystem(this, 'ecs-app-efs', {
      vpc: vpc,
      encrypted: true,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      securityGroup: efsSg
    });
    const efsAccessPoint = fileSystem.addAccessPoint('efs-root-access-point');
    efsAccessPoint.node.addDependency(fileSystem);

    const efsRootAccessPolicy = new iam.PolicyStatement({
      sid: 'efsRootAccessPolicy',
      actions: [
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientRootAccess'
      ], 
      resources: [
          efsAccessPoint.accessPointArn,
          fileSystem.fileSystemArn
      ]
    })
    const role = new iam.Role(this, 'efs-root-access-role', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ec2.amazonaws.com'),
        new iam.ServicePrincipal('cloud9.amazonaws.com'),
      ),
      managedPolicies: [
        new iam.ManagedPolicy(this, 'efs-root-policy', {statements: [efsRootAccessPolicy]}),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloud9SSMInstanceProfile')
      ],
    })
    const cfnInstanceProfile = new iam.CfnInstanceProfile(this, 'efs-root-access-instance-profile', {
      roles: [role.roleName]
    });
    new cdk.CfnOutput(this, 'efsArn', {
      value: fileSystem.fileSystemArn,
      description: 'EFS ARN',
    });
    new cdk.CfnOutput(this, 'efsId', {
      value: fileSystem.fileSystemId,
      description: 'EFS Id',
    });
    new cdk.CfnOutput(this, 'iamRole', {
      value: role.roleArn,
      description: 'IAM Role',
    });

  }
}
