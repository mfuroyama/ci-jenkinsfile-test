def buildSomething () {
    println('Building something')
}

def insertPropsWarWeb(String propFolder, String propFile, String helpFileFolder) {
    println('insertPropsWarWeb')
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