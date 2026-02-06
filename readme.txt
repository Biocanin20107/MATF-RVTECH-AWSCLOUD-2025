Projekat za predmet Razvoj aplikacija u cloud-u.

How to run:

1. Install Node.js dependencies (only the first time)
    npm install

2. Run LocalStack (fake AWS)
    docker-compose up -d

3. Set AWS credentials (these reset each terminal session)
    export AWS_ACCESS_KEY_ID=test
    export AWS_SECRET_ACCESS_KEY=test
    export AWS_DEFAULT_REGION=us-east-1

4. Deploy backend (Lambda + DynamoDB + API Gateway)
    npm run deploy

5. Upload- frontend to S3
    npm run deploy-web

5. Open site in browser
    http://chargers-website.s3-website.localhost.localstack.cloud:4566
