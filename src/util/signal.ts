type CBFunction<V extends any[]> = ((...args: V) => void)

type DisconnectFunction = () => void
export default class Signal<V extends any[]> {
    connections: CBFunction<V>[] = [];

    fire(...args: V) {
        this.connections.forEach(signal => signal(...args));
    }

    connect(fn: CBFunction<V>): DisconnectFunction {
        const i = this.connections.push(fn) - 1;
        return () => {
            this.connections.slice(i, 1);
        }
    }
}