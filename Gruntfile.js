module.exports = function(grunt) {
    grunt.initConfig({
        ts: {
            default : {
                src: ["src/**/*.ts", "!node_modules/**"],
                options: {
                  declaration: true,
                  module: "amd",
                  target: "es6"
                },
                out: "dist/sims4.js",
            }

        }
    });
    grunt.loadNpmTasks("grunt-ts");
    grunt.registerTask("default", ["ts"]);
};
