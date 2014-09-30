/*
 * This file is part of Wakanda software, licensed by 4D under
 *  (i) the GNU General Public License version 3 (GNU GPL v3), or
 *  (ii) the Affero General Public License version 3 (AGPL v3) or
 *  (iii) a commercial license.
 * This file remains the exclusive property of 4D and/or its licensors
 * and is protected by national and international legislations.
 * In any event, Licensee's compliance with the terms and conditions
 * of the applicable license constitutes a prerequisite to any use of this file.
 * Except as otherwise expressly stated in the applicable license,
 * such license does not include any other license or rights on this file,
 * 4D's and/or its licensors' trademarks and/or other proprietary rights.
 * Consequently, no title, copyright or other proprietary rights
 * other than those specified in the applicable license is granted.
 */

// By default cmd.exe on windows uses code page IBM850.
// Wakanda Server configures at launch its console to use the current ANSI code page
// because most command line tools expect and outputs this code page instead of IBM850.

// You can force the use of utf-16 ("ucs2") code page.
// in that case, the shell worker will use the /u option when calling cmd.exe.

exports.encoding = os.isWindows ? "windowsANSICodePage" : "utf8";

var prepareCommandLine = os.isWindows ?
	function (inCommand) {
	    // on windows, build one single command string,
	    // and force unicode mode if user wants utf-16
	    var cmd = (exports.encoding == "ucs2") ? "cmd /u" : "cmd"
	    return cmd + ' /s /c "' + inCommand + '"';
	}
	:
	function (inCommand) {
        // on unix, pass arguments individually
	    return ['sh', '-c', inCommand];
	};


exports.exec = function exec(inCommand, inFolder, inVariables) {

    var systemResult = SystemWorker.exec(prepareCommandLine(inCommand), {folder:inFolder, variables:inVariables});

    if (systemResult.exitStatus != 0) {
        var e = { name: "ShellError" };
        e.code = systemResult.exitStatus;
        e.message = systemResult.error.toString(exports.encoding);
        throw e;
    }

    return systemResult.output.toString(exports.encoding);
};

exports.create = function create(inCommand, inFolder, inVariables) {
    return function () {
        var worker = {};
        worker._systemWorker = new SystemWorker(prepareCommandLine(inCommand), {folder:inFolder, variables:inVariables});
        worker._systemWorker.setBinary(true);
        worker._systemWorker.onmessage = function (message) {
            if (typeof worker.onmessage == 'function') {
                worker.onmessage(message.data.toString(exports.encoding));
            }
        };
        worker._systemWorker.onerror = function (message) {
            if (typeof worker.onerror == 'function') {
                worker.onerror(message.data.toString(exports.encoding));
            }
        };
        worker._systemWorker.onterminated = function (message) {
            if (typeof worker.onterminated == 'function') {
                worker.onterminated(message);
            }
        };
        return worker;
    }();
}

