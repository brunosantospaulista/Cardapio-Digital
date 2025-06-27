// Arquivo: comunicados.js - VERSÃO COM ENVIO EM LOTE E SINALIZAÇÃO

let comunicadosSectionInitialized = false;

const MENSAGENS_PRE_MONTADAS = {
    aviso_novo_aplicativo: {
        titulo: 'Aviso de Casa Nova 📲',
        texto: `Olá, {nome_cliente}! Tudo bem? 😊\n\nEstamos de casa nova! 🚀 Agora você pode fazer seus pedidos da D'Italia Pizzaria pelo nosso novo site oficial, mais rápido e com promoções exclusivas!\n\nClique no link para conferir: https://www.pizzaditalia.com.br\n\nEsperamos seu pedido! 🍕`
    },
    nova_promocao: {
        titulo: 'Anunciar Nova Promoção 🍕',
        texto: `Olá, {nome_cliente}! 🍕 Passando para avisar que temos uma promoção imperdível te esperando! Peça hoje e aproveite.\n\nAcesse nosso cardápio: https://www.pizzaditalia.com.br`
    },
    novo_cupom: {
        titulo: 'Divulgar Cupom de Desconto 🎟️',
        texto: `E aí, {nome_cliente}! Liberamos um cupom de desconto especial para você. Use o código *NOVO10* no seu próximo pedido e ganhe 10% OFF!\n\nPeça agora: https://www.pizzaditalia.com.br`
    },
    cliente_ausente: {
        titulo: 'Reativar Cliente Ausente 👋',
        texto: `Olá, {nome_cliente}, sentimos sua falta! 😊 Que tal uma pizza deliciosa hoje? Preparamos nosso cardápio com muito carinho para você.\n\nDê uma olhada nas novidades: https://www.pizzaditalia.com.br`
    },
    aviso_funcionamento: {
        titulo: 'Aviso de Funcionamento (Sexta-feira) 🔥',
        texto: `Olá, {nome_cliente} boa noite! 🍕🔥 Já estamos com o forno a todo vapor esperando seu pedido 🛵💨! O melhor da pizza na sua casa.\n\nPeça pelo nosso site: https://www.pizzaditalia.com.br`
    }
};

async function initializeComunicadosSection() {
    if (comunicadosSectionInitialized) return;
    comunicadosSectionInitialized = true;
    console.log("Módulo Comunicados.js: Inicializando...");

    const mensagemTextarea = document.getElementById('comunicado-mensagem');
    const gerarLinksBtn = document.getElementById('gerar-links-envio');
    const enviarLoteBtn = document.getElementById('enviar-lote-selecionado-btn');
    const listaContainer = document.getElementById('lista-envio-whatsapp');
    const listaContainerWrapper = document.getElementById('lista-envio-whatsapp-container');
    const templateSelect = document.getElementById('template-selecao-mensagem');

    // Popula o menu de seleção
    if (templateSelect.options.length <= 1) {
        Object.keys(MENSAGENS_PRE_MONTADAS).forEach(key => {
            const option = new Option(MENSAGENS_PRE_MONTADAS[key].titulo, key);
            templateSelect.appendChild(option);
        });
    }
    
    templateSelect.addEventListener('change', (e) => {
        const selectedKey = e.target.value;
        mensagemTextarea.value = selectedKey ? MENSAGENS_PRE_MONTADAS[selectedKey].texto : '';
    });

    gerarLinksBtn.addEventListener('click', async () => {
        window.showToast("Buscando clientes...", "info");
        gerarLinksBtn.disabled = true;
        gerarLinksBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        
        try {
            const { collection, getDocs, query } = window.firebaseFirestore;
            const customersQuery = query(collection(window.db, "customer"));
            const querySnapshot = await getDocs(customersQuery);
            const allCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            renderCustomerList(allCustomers.filter(c => c.whatsapp));
            listaContainerWrapper.classList.remove('hidden');
        } catch (error) {
            console.error("Erro ao gerar lista de clientes:", error);
            window.showToast("Ocorreu um erro ao buscar os clientes.", "error");
        } finally {
            gerarLinksBtn.disabled = false;
            gerarLinksBtn.innerHTML = '<i class="fas fa-list"></i> Gerar Lista de Clientes';
        }
    });
    
    enviarLoteBtn.addEventListener('click', () => {
        const mensagemBase = mensagemTextarea.value;
        if (!mensagemBase) {
            window.showToast("Escreva uma mensagem antes de enviar.", "warning");
            return;
        }

        const checkboxes = listaContainer.querySelectorAll('.customer-select-checkbox:checked');
        
        // Abre o WhatsApp para os selecionados
        checkboxes.forEach(checkbox => {
            const customerRow = checkbox.closest('tr');
            const customerId = customerRow.dataset.customerId;
            const customerName = customerRow.dataset.customerName;
            const customerWhatsapp = customerRow.dataset.customerWhatsapp;

            const mensagemPersonalizada = mensagemBase.replace(/{nome_cliente}/g, customerName);
            const whatsappLink = `https://wa.me/55${customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemPersonalizada)}`;
            
            window.open(whatsappLink, '_blank');
            markAsSent(customerId); // Marca como enviado
        });

        // Atualiza a UI após o envio
        updateCustomerListUI();
    });

    function renderCustomerList(customers) {
        if (customers.length === 0) {
            listaContainer.innerHTML = '<p class="empty-list-message">Nenhum cliente com WhatsApp cadastrado.</p>';
            return;
        }

        const tableRows = customers.map(customer => {
            const nomeCliente = customer.firstName || "Cliente";
            const customerId = customer.id || customer.whatsapp;
            
            return `
                <tr data-customer-id="${customerId}" data-customer-name="${nomeCliente}" data-customer-whatsapp="${customer.whatsapp}">
                    <td class="checkbox-cell">
                        <input type="checkbox" class="customer-select-checkbox" data-customer-id="${customerId}">
                    </td>
                    <td>${nomeCliente} ${customer.lastName || ''}</td>
                    <td>${customer.whatsapp}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-success individual-send-btn"><i class="fab fa-whatsapp"></i> Enviar</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        listaContainer.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th class="checkbox-cell"><input type="checkbox" id="select-all-customers"></th>
                        <th>Nome</th>
                        <th>WhatsApp</th>
                        <th>Ação Individual</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        addTableEventListeners();
        updateCustomerListUI(); // Aplica o status 'sent' ao carregar
    }

    function addTableEventListeners() {
        // Lógica para limitar a seleção a 5 checkboxes
        const checkboxes = listaContainer.querySelectorAll('.customer-select-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('click', (e) => {
                const checkedCount = listaContainer.querySelectorAll('.customer-select-checkbox:checked').length;
                if (checkedCount > 5) {
                    window.showToast("Você pode selecionar no máximo 5 clientes por vez.", "warning");
                    e.target.checked = false; // Desfaz a seleção
                }
                updateBatchButtonState();
            });
        });

        // Lógica para o botão "Selecionar Todos" (que na verdade seleciona os 5 primeiros visíveis)
        document.getElementById('select-all-customers').addEventListener('click', (e) => {
            checkboxes.forEach((cb, index) => {
                cb.checked = e.target.checked && index < 5 && !cb.closest('tr').classList.contains('sent');
            });
            updateBatchButtonState();
        });
        
        // Lógica para o botão de envio individual
        listaContainer.querySelectorAll('.individual-send-btn').forEach(button => {
            button.addEventListener('click', () => {
                const customerRow = button.closest('tr');
                const customerId = customerRow.dataset.customerId;
                const customerName = customerRow.dataset.customerName;
                const customerWhatsapp = customerRow.dataset.customerWhatsapp;
                
                const mensagemBase = mensagemTextarea.value;
                if (!mensagemBase) {
                    window.showToast("Escreva uma mensagem antes de enviar.", "warning");
                    return;
                }

                const mensagemPersonalizada = mensagemBase.replace(/{nome_cliente}/g, customerName);
                const whatsappLink = `https://wa.me/55${customerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemPersonalizada)}`;
                window.open(whatsappLink, '_blank');
                markAsSent(customerId);
                updateCustomerListUI();
            });
        });
    }
    
    function updateBatchButtonState() {
        const checkedCount = listaContainer.querySelectorAll('.customer-select-checkbox:checked').length;
        if (checkedCount > 0) {
            enviarLoteBtn.classList.remove('hidden');
            enviarLoteBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Enviar para ${checkedCount} Selecionado(s)`;
        } else {
            enviarLoteBtn.classList.add('hidden');
        }
    }

    function markAsSent(customerId) {
        const sentTime = new Date().getTime(); // Pega o tempo atual em milissegundos
        localStorage.setItem(`sent_${customerId}`, sentTime);
    }
    
    function updateCustomerListUI() {
        const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
        const now = new Date().getTime();
        
        listaContainer.querySelectorAll('tr[data-customer-id]').forEach(row => {
            const customerId = row.dataset.customerId;
            const sentTimestamp = localStorage.getItem(`sent_${customerId}`);
            
            if (sentTimestamp) {
                if (now - sentTimestamp < TWO_HOURS_IN_MS) {
                    // Ainda está no período de 2 horas
                    row.classList.add('sent');
                    row.querySelector('.customer-select-checkbox').disabled = true;
                    row.querySelector('.customer-select-checkbox').checked = false;
                } else {
                    // Já passaram 2 horas, remove a marcação
                    localStorage.removeItem(`sent_${customerId}`);
                    row.classList.remove('sent');
                    row.querySelector('.customer-select-checkbox').disabled = false;
                }
            } else {
                row.classList.remove('sent');
                row.querySelector('.customer-select-checkbox').disabled = false;
            }
        });
        updateBatchButtonState();
    }
}

window.initializeComunicadosSection = initializeComunicadosSection;
