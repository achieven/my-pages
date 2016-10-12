let state = {
    data: [],
    fetching: true,
    error: null,
    foo: 'bar'
};

let action = {
    type: 'DATE_FETCHED',
    data: [
        {
            _id: '1',
            createdBy: '2',
            buyer: {
                _id: '5',
                foo: 'bar',
                email: 'foo@bar.com'
            },
            request: {
                _id: '2',
                foo: 'bar',
                createdBy: '5'
            }
        }
    ]
};


const returnNewState = function (state, action) {
    return {
        ...state,
        data: action.payload.data.map((order) => ({ ...order, request: {...order.request, createdBy: order.buyer} })),
        fetching: false,
        error: null
    };
};

returnNewState(state, action);