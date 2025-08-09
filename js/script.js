class SkinManager {
    constructor() {
        this.structureTheme = null;
        this.skin = new SkinLoader();
    }

    read() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput.files.length) return;

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const skinBytes = e.target.result;
            const skinData = new DataView(skinBytes);
            this.skin.name = file.name;
            this.structureTheme = this.skin.read(skinData);
            this.loadProperties(this.structureTheme);
        };

        reader.readAsArrayBuffer(file);
    }

    save() {
        if (this.structureTheme && this.skin) {
            this.skin.save(this.structureTheme);
        }
    }

    getNestedAttribute(path, obj, setValue = null) {
        const attrs = path.split('.');
        const last = attrs.pop();

        const target = attrs.reduce((acc, key) => acc?.[key], obj);
        if (target && last) {
            if (setValue !== null) {
                target[last] = setValue;
            } else {
                return target[last];
            }
        }
    }

    genFields(object, containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // Удаляем старые поля
        container.querySelectorAll('.field-color:not(.d-none), .field-integer:not(.d-none)').forEach(el => el.remove());

        const templateColor = document.querySelector('.field-color.d-none');
        const templateInteger = document.querySelector('.field-integer.d-none');

        for (const prop in object) {
            const value = object[prop];
            let field, input, label;

            if (typeof value === 'string' && /^#/.test(value)) {
                // Цветовое поле
                field = templateColor.cloneNode(true);
                input = field.querySelector('input[type=color]');
                label = field.querySelector('label');
                const textInput = field.querySelector('input[type=text]');

                label.textContent = prop + ':';
                input.value = value;
                textInput.value = value;

                const syncInputs = (source) => {
                    let val = source.value.toUpperCase();
                    source.value = val;
                    if (/^#[0-9A-F]{6}$/.test(val)) {
                        input.value = val;
                        textInput.value = val;
                        object[prop] = val;
                        input.classList.remove('is-invalid');
                        textInput.classList.remove('is-invalid');
                    } else {
                        input.classList.add('is-invalid');
                        textInput.classList.add('is-invalid');
                    }
                };

                input.oninput = () => syncInputs(input);
                textInput.oninput = () => syncInputs(textInput);
            } else {
                // Числовое поле
                field = templateInteger.cloneNode(true);
                input = field.querySelector('input[type=number]');
                label = field.querySelector('label');

                label.textContent = prop + ':';
                input.value = value;

                input.oninput = () => {
                    if (!isNaN(input.value) && input.checkValidity()) {
                        object[prop] = Number(input.value);
                        input.classList.remove('is-invalid');
                    } else {
                        input.classList.add('is-invalid');
                    }
                };
            }

            field.classList.remove('d-none');
            container.appendChild(field);
        }
    }

    loadProperties(structure) {
        if (!structure || !structure.params || !structure.buttons) return;

        this.genFields(structure.params.dtp, '#dtp');
        this.genFields(structure.params.active, '#active');
        this.genFields(structure.params.inactive, '#inactive');
        this.genFields(structure.params.margin, '#margin');

        if (structure.buttons.length > 0) this.genFields(structure.buttons[0], '#close');
        if (structure.buttons.length > 1) this.genFields(structure.buttons[1], '#min');

        document.querySelector('.col-md-2')?.classList.add('d-md-block');
        document.querySelector('.col-12')?.classList.add('col-md-10');
    }
}

const skinManager = new SkinManager();
