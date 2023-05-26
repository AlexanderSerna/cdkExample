import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "path";

export class AppExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new cdk.aws_lambda_nodejs.NodejsFunction(this, "lambdaHelloWorld", {
      entry: path.join(__dirname, "lambdaHelloWorld", "handler.ts"),
      handler: "handler",
    });
    const ApiGateway = new cdk.aws_apigateway.RestApi(
      this,
      "ExampleApiGateway",
      {}
    );
    const routesResources = ApiGateway.root.addResource("v1");

    const lambdaRandomNumber = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "randomNumber",
      {
        entry: path.join(__dirname, "randomNumber", "handler.ts"),
        handler: "handler",
      }
    );

    routesResources.addMethod(
      "GET",
      new cdk.aws_apigateway.LambdaIntegration(lambdaRandomNumber)
    );

    const lambdaWord = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "lambdaWord",
      {
        entry: path.join(__dirname, "lambdaWord", "handler.ts"),
        handler: "handler",
      }
    );

    routesResources
      .addResource("{word}")
      .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(lambdaWord));

    const notesTable = new cdk.aws_dynamodb.Table(this, "notesTable", {
      partitionKey: {
        name: "PK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const createNote = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "createNote",
      {
        entry: path.join(__dirname, "createNote", "handler.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: notesTable.tableName, // VERY IMPORTANT
        },
      }
    );

    const getNote = new cdk.aws_lambda_nodejs.NodejsFunction(this, "getNote", {
      entry: path.join(__dirname, "getNote", "handler.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: notesTable.tableName, // VERY IMPORTANT
      },
    });
    notesTable.grantWriteData(createNote); // VERY IMPORTANT
    notesTable.grantReadData(getNote); // VERY IMPORTANT
    const notesResource = ApiGateway.root
      .addResource("notes")
      .addResource("{userId}");

    notesResource.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(createNote)
    );

    notesResource
      .addResource("{id}")
      .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(getNote));

    const articleBucketS3 = new cdk.aws_s3.Bucket(this, "articlesBucket", {
      lifecycleRules: [
        // Enable intelligent tiering
        {
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(0),
            },
          ],
        },
      ],
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL, // Enable block public access
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED, // Enable encryption
    });

    // Create the database
    const articlesDatabase = new cdk.aws_dynamodb.Table(
      this,
      "articlesDatabase",
      {
        partitionKey: {
          name: "PK",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "SK",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      }
    );
    // Create the publishArticle Lambda function
    const publishArticle = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "publishArticle",
      {
        entry: path.join(__dirname, "publishArticle", "handler.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: articleBucketS3.bucketName,
          TABLE_NAME: articlesDatabase.tableName,
        },
      }
    );

    // Create the listArticles Lambda function
    const listArticles = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "listArticles",
      {
        entry: path.join(__dirname, "listArticles", "handler.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: articleBucketS3.bucketName,
          TABLE_NAME: articlesDatabase.tableName,
        },
      }
    );

    // Create the getArticle Lambda function
    const getArticle = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "getArticle",
      {
        entry: path.join(__dirname, "getArticle", "handler.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: articleBucketS3.bucketName,
        },
      }
    );
    // Permissions in resources articles
    articleBucketS3.grantWrite(publishArticle);
    articlesDatabase.grantWriteData(publishArticle);
    articlesDatabase.grantReadData(listArticles);
    articleBucketS3.grantRead(getArticle);

    // add resources API GATEWAY articles
    const articlesResource = ApiGateway.root.addResource("articles");

    articlesResource.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(publishArticle)
    );
    articlesResource.addMethod(
      "GET",
      new cdk.aws_apigateway.LambdaIntegration(listArticles)
    );
    articlesResource
      .addResource("{id}")
      .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(getArticle));

    // ADD AUTHENTICATION COGNITO USER POOL
    const userPool = new cdk.aws_cognito.UserPool(this, "myFirstUserPool", {
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
    });
    const userPoolClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "myFirstUserPoolClient",
      {
        userPool,
        authFlows: {
          userPassword: true,
        },
      }
    );
    // Provision a signup lambda function
    const signup = new cdk.aws_lambda_nodejs.NodejsFunction(this, "signup", {
      entry: path.join(__dirname, "signup", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });
    // Give the lambda function the permission to sign up users
    signup.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:SignUp"],
        resources: [userPool.userPoolArn],
      })
    );
    // Provision a signup lambda function
    const confirm = new cdk.aws_lambda_nodejs.NodejsFunction(this, "confirm", {
      entry: path.join(__dirname, "confirm", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // Give the lambda function the permission to sign up users
    confirm.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:ConfirmSignUp"],
        resources: [userPool.userPoolArn],
      })
    );

    // Provision a signin lambda function
    const signin = new cdk.aws_lambda_nodejs.NodejsFunction(this, "signin", {
      entry: path.join(__dirname, "signin", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // GIve the lambda function the permission to sign in users
    signin.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:InitiateAuth"],
        resources: [userPool.userPoolArn],
      })
    );
    // Create a new API
    const apiAuth = new cdk.aws_apigateway.RestApi(this, "ApiAuth", {});
    // Add routes to the API
    apiAuth.root
      .addResource("sign-up")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(signup));
    apiAuth.root
      .addResource("sign-in")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(signin));
    apiAuth.root
      .addResource("confirm")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(confirm));
    // Create an authorizer based on the user pool
    const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "myFirstAuthorizer",
      {
        cognitoUserPools: [userPool],
        identitySource: "method.request.header.Authorization",
      }
    );

    const secretLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "secret",
      {
        entry: path.join(__dirname, "secret", "handler.ts"),
        handler: "handler",
      }
    );

    // Create a new secret route, triggering the secret Lambda, and protected by the authorizer
    apiAuth.root
      .addResource("secret")
      .addMethod(
        "GET",
        new cdk.aws_apigateway.LambdaIntegration(secretLambda),
        {
          authorizer,
          authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
        }
      );
  }
}
