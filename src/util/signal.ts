type CBFunction<V extends any[]> = ((...args: V) => void)

export default class Signal<V extends any[]> {
    connections: CBFunction<V>[] = [];

    fire(...args: V) {
        this.connections.forEach(signal => signal(...args));
    }

    connect(fn: CBFunction<V>) {
        this.connections.push(fn);
    }
}