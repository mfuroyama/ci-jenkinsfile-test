def buildSomething () {
    println('Building something')
}

// echo "Pulling CV ${params.CV_MODULE} from ${params.CV_BRANCH} ${JENKINS_URL}"
// git branch:"cv/${params.CV_MODULE}/${params.CV_ENVIRONMENT}", url: "https://${params.CV_CREDENTIALS_ID}@github.com/mfuroyama/project-flow-test.git"

def cloneRepository() {
    println "Pulling CV ${params.CV_MODULE} from ${params.CV_BRANCH} ${JENKINS_URL}"
    git branch: "cv/${params.CV_MODULE}/${params.CV_ENVIRONMENT}", url: "https://${params.CV_CREDENTIALS_ID}@github.com/mfuroyama/project-flow-test.git" }
}

def buildWAR () {
    println "Build CV ${params.CV_MODULE} ${params.CV_ENVIRONMENT} ${params.CV_VERSION}"
    sh '''
        echo './grailsw -Dhttps.protocols=TLSv1.2 -Dgrails.env=production war'
        pwd
        ls -al
    '''
}

def insertPropsWarWeb(String propFolder, String propFile, String helpFileFolder) {
    println('insertPropsWarWeb')
    println(propFolder)
    println(propFile)
    println(helpFileFolder)
}

def insertPropsWarWebWithDeployFile(String propFolder, String propFile, String appName, String appTarget, String wlsDomain, String appPath, String helpFileFolder) {
    println('insertPropsWarWebWithDeployFile')
    println(propFolder)
    println(propFile)
    println(helpFileFolder)
}

/**
 * Push artifact to Nexus server
 * @param  groupId        [description]
 * @param  artifactId     [description]
 * @param  repo           [description]
 * @param  artifactFolder [description]
 * @param  fileType       [description]
 * @param  deployFile=''  [description]
 * @return                [description]
 */
def pushToNexus(String groupId, String artifactId, String repo, String artifactFolder, String fileType, String deployFile='') {
    println('pushToNexus')
    println(groupId)
    println(artifactId)

    dir("${env.WORKSPACE}") {
        sh "pwd"
    }
    buildNumber="${env.BUILD_NUMBER}"
    buildTimestamp="${env.BUILD_TIMESTAMP}"

    println("pushToNexus:" + buildNumber + buildTimestamp)
}

return this