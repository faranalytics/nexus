export interface HTTPRequestBody {
    data: {
        event_type: string,
        payload: {
            call_control_id: string
        }
    }
};
