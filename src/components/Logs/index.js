import {
    Button,
    Classes,
    Drawer,
    Position,
} from "@blueprintjs/core";
import React, { useState } from 'react';

const Logs = (props) => {

    const [state, setState] = useState({
        autoFocus: true,
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        enforceFocus: true,
        hasBackdrop: true,
        isOpen: false,
        position: Position.RIGHT,
        size: undefined,
        usePortal: true,
    });

    const handleOpen = () => setState({ isOpen: true });

    const handleClose = () => setState({ isOpen: false });

    return (
        <>
            <Button onClick={handleOpen} icon="wrench" outlined={true}
                intent="warning"></Button>
            <Drawer
                icon="info-sign"
                onClose={handleClose}
                title="What's happening ?"
                {...state}
            >
                <div className={Classes.DRAWER_BODY}>
                    <div className={Classes.DIALOG_BODY}>
                        <ul className="list">
                            {
                                props?.logs.map((x, i) => (
                                    <li key={i}>{x}</li>
                                ))
                            }
                        </ul>
                    </div>
                </div>
            </Drawer>
        </>
    )
}

export default Logs;
