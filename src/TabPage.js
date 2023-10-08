import React, { useState, useEffect } from 'react';

function TabPage(props) {
    return (
        <div style={{
            width: 500, 
            height: 570, 
            backgroundColor: '#FFFFFF', 
            position: 'absolute', 
            paddingRight: '20px',
            left: -527, 
            top: props.top, 
            borderWidth: '2px',
            border: 'solid #2F506D',}}>
            <div style={{paddingLeft: '20px', paddingTop: '5px'}}>
                {props.children}
            </div>
        </div>
    )
}

export default TabPage;