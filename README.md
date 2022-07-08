# Required Tools

In order to run this project you first have to install the following things:

-   _Ubuntu_ For the MarcoTAO scripts to work properly is recommended to run the project in a Ubuntu environment. During development, **Ubuntu 20.04.4 LTS** was used
-   _NodeJS_ https://nodejs.org/en/ (^14.18.0)
-   _NPM_ It should have come bundled together with NodeJS (^6.14.15)
-   _Docker_ https://www.docker.com/ (and _docker-compose_)
-   _Fromdos_ This is required by some of the MarcoTAO scripts. You can install the package with `apt-get install tofrodos`

# Install Dependencies

The project requires a series of dependencies (ie. Express) in order to run. These dependencies are all included in the _package.json_ file. To install the dependencies, simply run `npm install` in the project root folder

# Environment Variables

The app reads some data from the environment of the application. You must create a `.env` file in the folder `src/app/config/.env` The `.env.template` file in the same path contains an example of all the variables expected.

-   **PORT** This is the port the app will bind and start listening at. Keep in mind it should be in-sync with whatever port you configured in the `REACT_APP_API_URL` in the frontend
-   **TYPEORM\_** All the variables prefixed with this string are part of typeorm configuration. You can find more information about them at the [typeorm docs](https://typeorm.io/)
-   **JWT_SECRET** This is the string that is used as the secret to sign the JWT provided for authentication.

In order to work with the files the app must manage, it uses AWS S3 service as external file service. This makes it so a AWS account with access to S3 is required to run the app.

-   **AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY** This are the variables that identify the app in the AWS services.
-   **AWS_REGION** The region where the AWS services are available. Most likely it will be _eu-west-3 (Europe/Paris)_
-   **AWS_PROCESSED_CORPUS_BUCKET, AWS_SEARCH_PARAMETER_FILES_BUCKET, AWS_TMP_SEARCH_RESULTS_BUCKET** These are the names of the S3 buckets where the different files will be store (the _TMP_SEARCH_RESULTS_BUCKET_ is deprecated and should not be required)

Keep in mind that the security group of the user linked to the provided credentials will have to provide access to the buckets listed. Specifically, these policies are required in all the buckets:

-   _ListBucket_
-   _GetObject_
-   _DeleteObject_
-   _PutObject_

# Run the App

After everything have been configured, the following steps should be followed in order to run the app

1.  Set up the postgres docker enviroment by running `npm run docker:up:unix`
2.  After the container is up and running, you can run the app in development mode by running `npm run dev:unix` Alternatively, a hot-reloading mode can be enabled by running `npm run dev:watch:unix` This way, any changes made to the source code will trigger an app reload, thus applying in _almost_ real time while developing

# Run Tests

You can run all tests developed for the app by running `npm run test` (After installing the necessary dependencies)

> Written with [StackEdit](https://stackedit.io/).
