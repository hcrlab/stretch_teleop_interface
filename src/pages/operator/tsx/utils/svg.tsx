import armDown from "operator/icons/Arm_Down.svg"
import armExtend from "operator/icons/Arm_Reach.svg"
import armRetract from "operator/icons/Arm_Retract.svg"
import armUp from "operator/icons/Arm_Up.svg"
import driveLeft from "operator/icons/Drive_Left.svg"
import driveRight from "operator/icons/Drive_Right.svg"
import gripClose from "operator/icons/Grip_Grasp.svg"
import gripLeft from "operator/icons/Grip_Left.svg"
import gripOpen from "operator/icons/Grip_Open.svg"
import gripRight from "operator/icons/Grip_Right.svg"
import driveForward from "operator/icons/Drive_Forward.svg"
import driveReverse from "operator/icons/Drive_Reverse.svg"
import panLeft from "operator/icons/Pan_Left.svg"
import panRight from "operator/icons/Pan_Right.svg"
import tiltUp from "operator/icons/Tilt_Up.svg"
import tiltDown from "operator/icons/Tilt_Down.svg"

import { ButtonPadButton } from "../function_providers/ButtonFunctionProvider"

/** The pixel width of SVG components. */
export const SVG_RESOLUTION = 500;


/** 
 * Possible layouts for the button pad (i.e. the shape and arrangement of the 
 * buttons)
 */
export enum ButtonPadShape {
    Directional,
    ManipRealsense,
    Gripper,
    ManipOverhead,
    SimpleButtonPad
}

/**
 * Takes a percentage value and returns a pixel value based on {@link SVG_RESOLUTION}
 * 
 * @param percentage value between 0 and 100
 * @returns the pixel location
 * @example 0 -> 0, 50 -> resolution/2, 100 -> resolution
 */
export function percent2Pixel(percentage: number) {
    return SVG_RESOLUTION / 100 * percentage;
}

/**
 * Position and dimensions of the robot base from the overhead camera view
 */
export const OVERHEAD_ROBOT_BASE = {
    centerX: percent2Pixel(50.5),
    centerY: percent2Pixel(55),
    height: percent2Pixel(10),
    width: percent2Pixel(15)
}

/**Creates the SVG path for a rectangle
 * @param x left edge location
 * @param y top edge location
 * @param width the width
 * @param height the height
*/
export function rect(x: number, y: number, width: number, height: number) {
    return `M ${x} ${y} ${x + width} ${y} ${x + width} ${y + height} 
                ${x} ${y + height} Z`;
}
/** Represents the position and size of a box */
type BoxPosition = {
    centerX: number,
    centerY: number,
    height: number,
    width: number
}

/** Default box position with the box centered and a height and width 
 * of 10%
 */
const DEFAULT_POSITION = {
    centerX: percent2Pixel(50),
    centerY: percent2Pixel(50),
    height: percent2Pixel(10),
    width: percent2Pixel(10)
}

/**
 * Gets a list of path string descriptions for each button based on the {@link ButtonPadShape}
 * 
 * @param shape {@link ButtonPadShape} enum representing the shape of the button pad
 * @returns a list of strings where each string is a path description for the shape of a single button
 */
export function getPathsFromShape(shape: ButtonPadShape, aspectRatio?: number): [string[], { x: number, y: number }[]] {
    const width = SVG_RESOLUTION;
    const height = aspectRatio ? SVG_RESOLUTION / aspectRatio : SVG_RESOLUTION;
    switch (shape) {
        case ButtonPadShape.Directional:
            return getDirectionalPaths(width, height);
        case ButtonPadShape.ManipRealsense:
            return getManipRealsensePaths(width, height);
        case ButtonPadShape.Gripper:
            return getGripperPaths(width, height);
        case ButtonPadShape.ManipOverhead:
            return getManipOverheadPaths(width, height);
        case ButtonPadShape.SimpleButtonPad:
            return getSimpleButtonPadPaths(width, height);
        default:
            throw Error(`Cannot get paths of unknown button pad shape ${ButtonPadShape}`);
    }
}

/**
 * Directional button pad made up of four trapazoids around a box in the 
 * center of the button pad.
 * 
 * Ordered: top, right, bottom, left (clockwise starting with the top)
 * 
 * @param onRobot if the square should be around the robot, centered if false
 */
function getDirectionalPaths(width: number, height: number, onRobot: boolean = true): [string[], { x: number, y: number }[]] {
    const boxPosition: BoxPosition = onRobot ? OVERHEAD_ROBOT_BASE : DEFAULT_POSITION;
    const { centerX, centerY, height: boxHeight, width: boxWidth } = boxPosition;
    const top = (centerY - boxHeight / 2) / width * height;
    const bot = (centerY + boxHeight / 2) / width * height;
    const lft = centerX - boxWidth / 2;
    const rgt = centerX + boxWidth / 2;

    const pathTop = `M 0 0 ${width} 0 ${rgt} ${top} ${lft} ${top} Z`
    const pathRgt = `M ${width} 0 ${width} ${height} 
                        ${rgt} ${bot} ${rgt} ${top} Z`
    const pathBot = `M 0 ${height} ${width} ${height} 
                        ${rgt} ${bot} ${lft} ${bot} Z`
    const pathLft = `M 0 0 0 ${height} ${lft} ${bot} ${lft} ${top} Z`

    const paths = [pathTop, pathRgt, pathBot, pathLft]
    const iconPositions = [
        { x: centerX, y: top / 2 },
        { x: (SVG_RESOLUTION + rgt) / 2, y: centerY / width * height },
        { x: centerX, y: (SVG_RESOLUTION / width * height + bot) / 2 },
        { x: (lft) / 2, y: centerY / width * height }
    ]
    return [paths, iconPositions];
}

/**
 * Ordered: top left, top right, then top, bottom, left, right trapezoids, then 
 * top and bottom center buttons, and finally bottom left and bottom right.
 */
function getManipRealsensePaths(width: number, height: number): [string[], { x: number, y: number }[]] {
    /**Number of button layers from top to bottom in the display*/
    const numVerticalLayers = 6;
    /**How tall each layer of buttons should be.*/
    const layerHeight = height / numVerticalLayers;
    const centerWidth = percent2Pixel(30);
    const centerLeft = (width - centerWidth) / 2;
    const centerRight = centerLeft + centerWidth;
    const center = percent2Pixel(50);
    const paths = [
        // Top two buttons: left, right
        rect(0, 0, center, layerHeight),
        rect(center, 0, center, layerHeight),
        // Center directional trapezoid buttons: top, bottom, left, right
        `M 0 ${layerHeight} ${width} ${layerHeight} ${centerRight} ${layerHeight * 2} 
            ${centerLeft} ${layerHeight * 2} Z`,
        `M 0 ${layerHeight * 5} ${width} ${layerHeight * 5} 
            ${centerRight},${layerHeight * 4} ${centerLeft},${layerHeight * 4} Z`,
        `M 0 ${layerHeight} 0 ${layerHeight * 5} ${centerLeft},${layerHeight * 4} 
            ${centerLeft},${layerHeight * 2} Z`,
        `M ${width} ${layerHeight} ${width} ${layerHeight * 5} 
            ${centerRight},${layerHeight * 4} ${centerRight},${layerHeight * 2} Z`,
        // // Center two rectangle buttons: top, bottom
        rect(centerLeft, layerHeight * 2, centerWidth, layerHeight),
        rect(centerLeft, layerHeight * 3, centerWidth, layerHeight),
        // // Bottom two buttons: left, right
        rect(0, layerHeight * 5, center, layerHeight),
        rect(center, layerHeight * 5, center, layerHeight)
    ]
    const iconPositions = [
        // Top two
        { x: center / 2, y: layerHeight / 2 },
        { x: (width + center) / 2, y: layerHeight / 2 },
        // Center directional trapezoid buttons
        { x: width / 2, y: layerHeight * 3 / 2 },
        { x: width / 2, y: layerHeight * 9 / 2 },
        { x: centerLeft / 2, y: layerHeight * 6 / 2 },
        { x: (width + centerRight) / 2, y: layerHeight * 6 / 2 },
        // Center two rectangle buttons
        { x: width / 2, y: layerHeight * 5 / 2 },
        { x: width / 2, y: layerHeight * 7 / 2 },
        // Bottom two buttons
        { x: center / 2, y: layerHeight * 11 / 2 },
        { x: (width + center) / 2, y: layerHeight * 11 / 2 }
    ]
    return [paths, iconPositions];
}

/**
 * Ordered top, botton, left, right, larger center, smaller center
 */
function getGripperPaths(width: number, height: number): [string[], { x: number, y: number }[]] {
    /**Number of button layers from top to bottom in the display*/
    const numLayers = 5;
    /**How wide each layer of buttons should be.*/
    const xMargin = width / numLayers;
    /**How tall each layer of buttons should be.*/
    const yMargin = height / numLayers;
    const paths = [
        rect(0, 0, width, yMargin),  // top
        rect(0, height - yMargin, width, yMargin),  // bottom
        rect(0, yMargin, xMargin, yMargin * 3),  // left
        rect(width - xMargin, yMargin, xMargin, yMargin * 3), // right
        // gripper open
        // Outside (clockwise)
        `M
        ${xMargin} ${yMargin} 
        ${width - xMargin} ${yMargin} 
        ${width - xMargin} ${height - yMargin} 
        ${xMargin} ${height - yMargin} 
        Z`
        // Inside (counterclockwise)
        + `M
        ${xMargin * 2} ${yMargin * 2} 
        ${xMargin * 2} ${height - yMargin * 2}
        ${width - xMargin * 2} ${height - yMargin * 2} 
        ${width - xMargin * 2} ${yMargin * 2}
        Z`,
        rect(xMargin * 2, yMargin * 2, xMargin, yMargin)  // gripper close
    ]
    const iconPositions = [
        { x: width / 2, y: yMargin / 2 },  // top
        { x: width / 2, y: (2 * height - yMargin) / 2 },  // bottom
        { x: yMargin / 2, y: height / 2 },  // left
        { x: (2 * width - yMargin) / 2, y: height / 2 },  // right
        { x: yMargin * 7 / 2, y: height / 2 },  // gripper open
        { x: width / 2, y: height / 2 },  // gripper close
    ]
    return [paths, iconPositions];
}


/**
 * Ordered top, bottom, far left, far right, inside left, inside right
 */
function getManipOverheadPaths(width: number, height: number): [string[], { x: number, y: number }[]] {
    const sidesPercent = 0.20;
    const sideWidth = width * sidesPercent;
    const centerWidth = width - 2 * sideWidth;
    const yLayer = height / 3;

    const paths = [
        rect(sideWidth, 0, centerWidth, yLayer),  // top
        rect(sideWidth, height - yLayer, centerWidth, yLayer),  // bottom
        rect(0, 0, sideWidth, height),  // far left
        rect(width - sideWidth, 0, sideWidth, height),  // far right
        rect(sideWidth, yLayer, centerWidth / 2, yLayer),  // inside left
        rect(sideWidth + centerWidth / 2, yLayer, centerWidth / 2, yLayer),  // inside right
    ];
    const iconPositions = [
        { x: width / 2, y: yLayer / 2 }, // top
        { x: width / 2, y: height - yLayer / 2 }, // bottom
        { x: sideWidth / 2, y: height / 2 }, // far left
        { x: width - sideWidth / 2, y: height / 2 }, // far right
        { x: sideWidth + centerWidth / 4, y: height / 2 }, // inside left
        { x: width - sideWidth - centerWidth / 4, y: height / 2 }, // inside right
    ]
    return [paths, iconPositions];
}

/**
 * Ordered top, bottom, left, right
 */
function getSimpleButtonPadPaths(width: number, height: number): [string[], { x: number, y: number }[]] {
    const endsPercent = 0.20;
    const endsHeight = height * endsPercent;
    const center = width / 2;
    const middleHeight = height - endsHeight * 2;

    const paths = [
        rect(0, 0, width, endsHeight),  // top
        rect(0, height - endsHeight, width, endsHeight),  // bottom
        rect(0, endsHeight, center, middleHeight),  // left
        rect(center, endsHeight, center, middleHeight)  // right
    ];
    const iconPositions = [
        { x: width / 2, y: endsHeight / 2 }, // top
        { x: width / 2, y: height - endsHeight / 2 }, // bottom
        { x: center / 2, y: height / 2 }, // left
        { x: width - center / 2, y: height / 2 }, // right
    ]
    return [paths, iconPositions];
}

/**
 * Gets the icon corresponding to a button in a button pad.
 * 
 * @param buttonPadButton 
 * @returns icon source
 */
export function getIcon(buttonPadButton: ButtonPadButton) {
    switch (buttonPadButton) {
        case (ButtonPadButton.BaseForward):
            return driveForward;
        case (ButtonPadButton.BaseReverse):
            return driveReverse;
        case (ButtonPadButton.BaseRotateRight):
            return driveRight;
        case (ButtonPadButton.BaseRotateLeft):
            return driveLeft;
        case (ButtonPadButton.ArmLift):
            return armUp;
        case (ButtonPadButton.ArmLower):
            return armDown;
        case (ButtonPadButton.ArmExtend):
            return armExtend;
        case (ButtonPadButton.ArmRetract):
            return armRetract;
        case (ButtonPadButton.GripperOpen):
            return gripOpen;
        case (ButtonPadButton.GripperClose):
            return gripClose;
        case (ButtonPadButton.WristRotateIn):
            return gripLeft;
        case (ButtonPadButton.WristRotateOut):
            return gripRight
        case (ButtonPadButton.CameraPanLeft):
            return panLeft
        case (ButtonPadButton.CameraPanRight):
            return panRight
        case (ButtonPadButton.CameraTiltUp):
            return tiltUp
        case (ButtonPadButton.CameraTiltDown):
            return tiltDown
        default:
            console.warn(`cannot get icon for ${buttonPadButton}`);
            return null;
    }
}