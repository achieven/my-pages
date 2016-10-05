import React from 'react'
import {render} from 'react-dom'
import {Provider} from 'react-redux'
import Client from './client/client'

render(
    <Provider>
        <Client>    </Client>
    </Provider>, document.getElementById('root')
);



