import React from 'react'
import { createRoot, Root } from 'react-dom/client';
import { WebRTCConnection } from 'shared/webrtcconnections';
import { WebRTCMessage, RemoteStream } from 'shared/util';
import { RemoteRobot } from 'shared/remoterobot';
import { cmd } from 'shared/commands';
import { Operator } from './Operator';
import { DEFAULT_VELOCITY_SCALE } from './static_components/SpeedControl';
import { StorageHandler } from './storage_handler/StorageHandler';
import { FirebaseStorageHandler } from './storage_handler/FirebaseStorageHandler';
import { LocalStorageHandler } from './storage_handler/LocalStorageHandler';
import { FirebaseOptions } from "firebase/app"
import { ButtonFunctionProvider } from './function_providers/ButtonFunctionProvider';
import { FunctionProvider } from './function_providers/FunctionProvider';
import { PredictiveDisplayFunctionProvider } from './function_providers/PredictiveDisplayFunctionProvider';
import { UnderVideoFunctionProvider } from './function_providers/UnderVideoFunctionProvider';
import { VoiceFunctionProvider } from './function_providers/VoiceFunctionProvider';
import "operator/css/index.css"

let allRemoteStreams: Map<string, RemoteStream> = new Map<string, RemoteStream>()
let remoteRobot: RemoteRobot;
let connection: WebRTCConnection;
let root: Root;

// Create the function providers. These abstract the logic between the React 
// components and remote robot.
export var buttonFunctionProvider = new ButtonFunctionProvider();
export var voiceFunctionProvider = new VoiceFunctionProvider();
export var predicitiveDisplayFunctionProvider = new PredictiveDisplayFunctionProvider();
export var underVideoFunctionProvider = new UnderVideoFunctionProvider()

// Create the WebRTC connection and connect the operator room
connection = new WebRTCConnection({
    peerRole: "operator",
    polite: true,
    onMessage: handleWebRTCMessage,
    onTrackAdded: handleRemoteTrackAdded,
    onMessageChannelOpen: initializeOperator,
    onConnectionEnd: disconnectFromRobot
});

connection.joinOperatorRoom()

// Check if the WebRTC connection is resolved. Reload every 4 seconds until resolved.
setTimeout(() => {
    let isResolved = connection.connectionState() == 'connected' ? true : false
    console.log("connection state: ", isResolved)
    if (isResolved) {
        console.log('WebRTC connection is resolved.');
    } else {
        window.location.reload()
    }
}, 4000);

// Create root once when index is loaded
const container = document.getElementById('root');
root = createRoot(container!);

/** Handle when the WebRTC connection adds a new track on a camera video stream. */
function handleRemoteTrackAdded(event: RTCTrackEvent) {
    console.log('Remote track added.');
    const track = event.track;
    const stream = event.streams[0];
    console.log('got track id=' + track.id, track);
    if (stream) {
        console.log('stream id=' + stream.id, stream);
    }
    console.log('OPERATOR: adding remote tracks');

    let streamName = connection.cameraInfo[stream.id]
    allRemoteStreams.set(streamName, { 'track': track, 'stream': stream });
}

/**
 * Callback to handle a new WebRTC message from the robot browser.
 * @param message the {@link WebRTCMessage} or an array of messages.
 */
function handleWebRTCMessage(message: WebRTCMessage | WebRTCMessage[]) {
    if (message instanceof Array) {
        for (const subMessage of message) {
            // Recursive call to handle each message in the array
            handleWebRTCMessage(subMessage)
        }
        return
    }
    switch (message.type) {
        case 'validJointState':
            remoteRobot.sensors.checkValidJointState(
                message.jointsInLimits,
                message.jointsInCollision
            );
            break;
        default:
            throw Error(`unhandled WebRTC message type ${message.type}`)
    }
}

/**
 * Sets up remote robot, creates the storage handler, 
 * and renders the operator browser.
 */
function initializeOperator() {
    configureRemoteRobot();
    let storageHandler: StorageHandler;
    const storageHandlerReadyCallback = () => {
        renderOperator(storageHandler);
    }
    storageHandler = createStorageHandler(storageHandlerReadyCallback);
    // renderOperator(storageHandler);
}

/** 
 * Configures the remote robot, which connects with the robot browser over the 
 * WebRTC connection.
 */
function configureRemoteRobot() {
    remoteRobot = new RemoteRobot({
        robotChannel: (message: cmd) => connection.sendData(message),
    });
    remoteRobot.setRobotMode("navigation");
    remoteRobot.sensors.setFunctionProviderCallback(buttonFunctionProvider.updateJointStates);
}

/**
 * Creates a storage handler based on the `storage` property in the process 
 * environment.
 * @param storageHandlerReadyCallback callback when the storage handler is ready
 * @returns the storage handler
 */
function createStorageHandler(storageHandlerReadyCallback: () => void) {
    switch (process.env.storage) {
        case ('firebase'):
            const config: FirebaseOptions = {
                apiKey: process.env.apiKey,
                authDomain: process.env.authDomain,
                projectId: process.env.projectId,
                storageBucket: process.env.storageBucket,
                messagingSenderId: process.env.messagingSenderId,
                appId: process.env.appId,
                measurementId: process.env.measurementId
            }
            return new FirebaseStorageHandler(
                storageHandlerReadyCallback,
                config
            );
        default:
            // if (process.env.storage == 'localstorage')
            return new LocalStorageHandler(storageHandlerReadyCallback);
    }
}

/**
 * Renders the operator browser.
 * 
 * @param storageHandler the storage handler
 */
function renderOperator(storageHandler: StorageHandler) {
    const layout = storageHandler.loadCurrentLayoutOrDefault();
    FunctionProvider.initialize(DEFAULT_VELOCITY_SCALE, layout.actionMode);
    FunctionProvider.addRemoteRobot(remoteRobot);

    root.render(
        <Operator
            remoteStreams={allRemoteStreams}
            layout={layout}
            storageHandler={storageHandler}
        />
    );
}

function disconnectFromRobot() {
    connection.hangup()
}

window.onbeforeunload = () => {
    connection.hangup()
};
