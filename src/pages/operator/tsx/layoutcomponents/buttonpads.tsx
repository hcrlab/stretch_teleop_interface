import React from "react";
import "operator/css/buttonpads.css"
import { CustomizableComponentProps } from "./customizablecomponent";
import { VideoStreamDef, VideoStreamId } from "../utils/componentdefinitions";
import { className } from "shared/util";
import { SVG_RESOLUTION, percent2Pixel, OVERHEAD_ROBOT_BASE, rect } from "shared/svg";

// TODO: this should probably be moved to utils
/** All the possible button functions */
export enum UserInteractionFunction {
    BaseForward,
    BaseReverse,
    BaseRotateRight,
    BaseRotateLeft,
    ArmLift,
    ArmLower,
    ArmExtend,
    ArmRetract,
    GripperOpen,
    GripperClose,
    WristRotateIn,
    WristRotateOut,
    PredictiveDisplay
}

/** Possible shapes for the button pad */
export enum ButtonPadShape {
    Directional,
    Realsense,
    Gripper
}

/** Functions called when the user interacts with the buttons. */
export type ButtonFunctions = {
    onClick: () => void,
    onRelease?: () => void,
    onLeave?: () => void
}

/** Properties for a single button on a button pad */
export type ButtonProps = ButtonFunctions & {
    /** The name of the button (acts as a tooltip) */
    label: string,
    icon?: object  // TODO: figure out how to put an icon on a button
}

/** Properties for an entire button pad */
export interface ButtonPadProps extends CustomizableComponentProps {
    /** List of properties for the buttons in this button pad
     * @length should be equal to number of buttons on the pad
     */
    buttonsProps: ButtonProps[];
    /** The shape of the button pad */
    buttonPadShape: ButtonPadShape;
    /** If defined, the parent video stream which contains this button pad. */
    videoStreamParent?: VideoStreamDef;
}

/** Button pad which can be overlaid as a child of a video stream or lonestanding */
export const ButtonPad = (props: ButtonPadProps) => {
    /** Reference to the SVG which makes up the button pad */
    const svgRef = React.useRef<SVGSVGElement>(null);
    const [contextMenu, setContextMenu] = React.useState<React.ReactElement | null>(null);
    /** List of path shapes for each button on the button pad */
    const paths: string[] = getPathsFromShape(props.buttonPadShape);
    const { customizing } = props.sharedState;
    const selected = props.path === props.sharedState.activePath;
    const overlay = props.videoStreamParent !== undefined;
    if (paths.length !== props.buttonsProps.length) {
        throw new Error(`paths length: ${paths.length}, buttonsProps length: ${props.buttonsProps.length}`);
    }

    /** Creates the buttons on the button pad */
    const mapPaths = (path: string, i: number) => {
        const buttonProps = props.buttonsProps[i]
        const clickProps = customizing ? {} : {
            onMouseDown: buttonProps.onClick,
            onMouseUp: buttonProps.onRelease,
            onMouseLeave: buttonProps.onLeave
        }
        const title = buttonProps.label;
        return (
            <path key={i} d={path} {...clickProps}>
                <title>{title}</title>
            </path>
        )
    }

    /** Call the shared onSelect function on this button pad component */
    const selectSelf = () => {
        props.sharedState.onSelect(props.definition, props.path);
        setContextMenu(null);
    }

    /** Call the shared onSelect fucntion for the parent video stream  */
    const selectParent = () => {
        const parentPath = props.path.split('-').slice(0, -1).join('-');
        props.sharedState.onSelect(props.videoStreamParent!, parentPath);
        setContextMenu(null);
    }

    /** Callback when SVG is clicked during customize mode */
    const onSelect = (event: React.MouseEvent<SVGSVGElement>) => {
        // Make sure the container of the button pad doesn't get selected
        event.stopPropagation();

        // If button pad is not overlaid on a video stream then select itself
        if (!overlay) {
            selectSelf();
            return;
        }

        // Open context menu to ask the user if they want to select the overlaid 
        // button pad or its parent video stream
        const { clientX, clientY } = event;
        const { left, top } = svgRef.current!.getBoundingClientRect();
        const x = clientX - left;
        const y = clientY - top;
        setContextMenu(
            <SelectContexMenu
                x={x}
                y={y}
                selectSelf={selectSelf}
                selectParent={selectParent}
                clickOut={() => setContextMenu(null)}
            />
        );
    }

    // In customizing state add onClick callback to button pad SVG element
    const selectProp = customizing ? {
        "onClick": onSelect
    } : {};

    return (
        <>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_RESOLUTION} ${SVG_RESOLUTION}`}
                preserveAspectRatio="none"
                className={className("button-pads", { live: !customizing, selected, overlay })}
                {...selectProp}
            >
                {paths.map(mapPaths)}
            </svg>
            {contextMenu}
        </>
    );
}

/** Props for {@link SelectContexMenu} */
type SelectContexMenuProps = {
    /** X location to render the context menu popup */
    x: number;
    /** Y location to render the context menu popup */
    y: number;
    /** Callback to select the button pad */
    selectSelf: () => void;
    /** Callback to select the parent video stream */
    selectParent: () => void;
    /** Callback to hide the context menu popup when click outside */
    clickOut: () => void;
}

/**
 * Creates a context menu popup when user clicks on the button pad during 
 * customization mode so the user can choose between the button pad and its 
 * parent video stream
 * @param props {@link SelectContexMenuProps}
 * @returns the context menu component
 */
const SelectContexMenu = (props: SelectContexMenuProps) => {
    const ref = React.useRef<HTMLUListElement>(null);

    // Handler to close dropdown when click outside
    React.useEffect(() => {

        /** Closes context menu if user clicks outside */
        const handler = (e: any) => {
            // If didn't click inside the context menu or the existing SVG, then
            // hide the popup
            if (ref.current && !ref.current.contains(e.target)) {
                props.clickOut();
                console.log('clicked')
            }
        };
        window.addEventListener("click", handler, true);
        return () => {
            window.removeEventListener("click", handler);
        };
    }, []);

    /**
     * Handles when the user clicks on one of the context menu options
     * @param e mouse event of the click
     * @param self if true selects itself (a button pad), if false selects its 
     * parent (the video stream)
     */
    function handleClick(e: React.MouseEvent<HTMLLIElement>, self: boolean) {
        self ? props.selectSelf() : props.selectParent();

        // Make sure background elements don't receive a click
        e.stopPropagation();
    }

    return (

        <ul aria-label="Select"
            ref={ref}
            className="button-pad-context-menu"
            style={{ top: `${props.y}px`, left: `${props.x}px` }}
        >
            <li onClick={(e) => handleClick(e, true)}>Button Pad</li>
            <li onClick={(e) => handleClick(e, false)}>Video Stream</li>
        </ul>
    );
}

/** Represents the position and size of a box */
type BoxPosition = {
    centerX: number,
    centerY: number,
    height: number,
    width: number
}

function getPathsFromShape(shape: ButtonPadShape, videoStreamParent?: VideoStreamDef) {
    switch (shape) {
        case (ButtonPadShape.Directional):
            const onRobot: boolean = videoStreamParent ? videoStreamParent.id == VideoStreamId.overhead : false;
            return getDirectionalPaths(onRobot);
        case (ButtonPadShape.Realsense):
            return getRealsenseManipPaths();
        case (ButtonPadShape.Gripper):
            return getGripperPaths();
    }
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
 * Directional button pad made up of four trapazoids around a box in the 
 * center of the button pad.
 * @param onRobot if the square should be around the robot, centered if false
 */
function getDirectionalPaths(onRobot: boolean) {
    const boxPosition: BoxPosition = onRobot ? OVERHEAD_ROBOT_BASE : DEFAULT_POSITION;
    const { centerX, centerY, height, width } = boxPosition;
    const top = centerY - height / 2
    const bot = centerY + height / 2
    const lft = centerX - width / 2
    const rgt = centerX + width / 2

    const pathTop = `M 0 0 ${SVG_RESOLUTION} 0 ${rgt} ${top} ${lft} ${top} Z`
    const pathRgt = `M ${SVG_RESOLUTION} 0 ${SVG_RESOLUTION} ${SVG_RESOLUTION} 
                        ${rgt} ${bot} ${rgt} ${top} Z`
    const pathBot = `M 0 ${SVG_RESOLUTION} ${SVG_RESOLUTION} ${SVG_RESOLUTION} 
                        ${rgt} ${bot} ${lft} ${bot} Z`
    const pathLft = `M 0 0 0 ${SVG_RESOLUTION} ${lft} ${bot} ${lft} ${top} Z`

    const paths = [pathTop, pathRgt, pathBot, pathLft]
    return paths;
}

/**
 * Ordered: top left, top right, then top right, bottom, left trapezoids, then 
 * top and bottom center buttons, and finally bottom left and bottom right.
 */
function getRealsenseManipPaths() {
    /**Number of button layers from top to bottom in the display*/
    const numVerticalLayers = 6;
    /**How tall each layer of buttons should be.*/
    const height = SVG_RESOLUTION / numVerticalLayers;
    const centerWidth = percent2Pixel(30);
    const centerLeft = (SVG_RESOLUTION - centerWidth) / 2;
    const centerRight = centerLeft + centerWidth;
    const center = percent2Pixel(50);
    const paths = [
        // Top two buttons
        rect(0, 0, center, height),
        rect(center, 0, center, height),
        // Center directional trapezoid buttons
        `M 0 ${height} ${SVG_RESOLUTION} ${height} ${centerRight} ${height * 2} 
            ${centerLeft} ${height * 2} Z`,
        `M 0 ${height * 5} ${SVG_RESOLUTION} ${height * 5} 
            ${centerRight},${height * 4} ${centerLeft},${height * 4} Z`,
        `M 0 ${height} 0 ${height * 5} ${centerLeft},${height * 4} 
            ${centerLeft},${height * 2} Z`,
        `M ${SVG_RESOLUTION} ${height} ${SVG_RESOLUTION} ${height * 5} 
            ${centerRight},${height * 4} ${centerRight},${height * 2} Z`,
        // // Center two rectangle buttons
        rect(centerLeft, height * 2, centerWidth, height),
        rect(centerLeft, height * 3, centerWidth, height),
        // // Bottom two buttons
        rect(0, height * 5, center, height),
        rect(center, height * 5, center, height)
    ]
    return paths;
}

/**
 * Ordered top, botton, left, right, larger center, smaller center
 */
function getGripperPaths() {
    /**Number of button layers from top to bottom in the display*/
    const numLayers = 5;
    /**How tall each layer of buttons should be.*/
    const margin = SVG_RESOLUTION / numLayers;
    const paths = [
        rect(0, 0, SVG_RESOLUTION, margin),  // top
        rect(0, SVG_RESOLUTION - margin, SVG_RESOLUTION, margin),  // bottom
        rect(0, margin, margin, margin * 3),  // left
        rect(SVG_RESOLUTION - margin, margin, margin, margin * 3), // right
        rect(margin, margin, margin * 3, margin * 3),  // gripper open
        rect(margin * 2, margin * 2, margin, margin)  // gripper close
    ]
    return paths;
}