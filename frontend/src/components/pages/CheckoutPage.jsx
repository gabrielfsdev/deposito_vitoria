import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "../atoms/button";
import { toast } from "sonner";
import { useOutletContext, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

// --- IMPORTANTE: Importando as máscaras ---
import { maskCPF, maskPhone } from "../../util/masks"; 

import { AddressForm } from "../molecules/AddressForm";
import { PaymentSelector } from "../molecules/PaymentSelector";
import { OrderSummary } from "../molecules/OrderSummary";
import { OrderService } from "../../services/orders/OrderService";

export function CheckoutPage() {
    const navigate = useNavigate();
    const { firebaseUser } = useAuth();

    const context = useOutletContext();
    const rawCartItems = context?.cartItems || [];
    const clearCart = context?.clearCart || (() => {});

    const cartItems = rawCartItems.map((item) => {
        const realPrice = Number(item.price) || Number(item.basePrice) || 0;
        return { ...item, price: realPrice };
    });

    const [deliveryInfo, setDeliveryInfo] = useState({
        name: "",
        email: "",
        phone: "",
        document: "",
        zipCode: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
    });

    const [paymentMethod, setPaymentMethod] = useState("pix");
    const [isProcessing, setIsProcessing] = useState(false);

    const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    const shipping = subtotal > 200 ? 0 : 25.0;
    const total = subtotal + shipping;

    // --- FUNÇÃO CORRIGIDA PARA APLICAR AS MÁSCARAS ---
    const handleInputChange = (field, value) => {
        let newValue = value;

        // Se for CPF, formata
        if (field === "document") {
            newValue = maskCPF(value);
        }
        
        // Se for Telefone, formata
        if (field === "phone") {
            newValue = maskPhone(value);
        }

        setDeliveryInfo((prev) => ({ ...prev, [field]: newValue }));
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(price);
    };

    const handleFinishOrder = async () => {
        if (
            !deliveryInfo.name ||
            !deliveryInfo.document ||
            !deliveryInfo.address ||
            !deliveryInfo.zipCode
        ) {
            toast.error("Preencha todos os dados de entrega e CPF.");
            return;
        }

        if (!firebaseUser) {
            toast.error("Você precisa estar logado.");
            navigate("/login");
            return;
        }

        setIsProcessing(true);

        try {
            const token = await firebaseUser.getIdToken();

            const orderPayload = {
                customer: {
                    name: deliveryInfo.name,
                    email: deliveryInfo.email,
                    phone: deliveryInfo.phone,
                    taxId: deliveryInfo.document,
                },
                billingAddress: {
                    zipCode: deliveryInfo.zipCode,
                    street: deliveryInfo.address,
                    number: deliveryInfo.number,
                    neighborhood: deliveryInfo.neighborhood,
                    city: deliveryInfo.city,
                    state: deliveryInfo.state,
                    complement: deliveryInfo.complement,
                },
                items: cartItems.map((item) => ({
                    id: item.productId || item.id,
                    quantity: item.quantity,
                    unitPrice: item.price,
                })),
                amount: Math.round(total * 100),
                paymentMethod:
                    paymentMethod.toUpperCase() === "CARD"
                        ? "CREDIT_CARD"
                        : "PIX",
            };

            const data = await OrderService.create(orderPayload, token);
            const { paymentUrl } = data;

            toast.success("Pedido gerado! Redirecionando para pagamento...");
            clearCart();

            if (paymentUrl) {
                setTimeout(() => {
                    window.location.href = paymentUrl;
                }, 1500);
            } else {
                navigate("/profile?section=orders");
            }
        } catch (error) {
            console.error("Erro checkout:", error);
            toast.error(
                error.response?.data?.message || "Erro ao processar pedido."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <h2 className="text-2xl font-bold text-muted-foreground mb-4">
                    Seu carrinho está vazio
                </h2>
                <Button onClick={() => navigate("/")}>
                    Voltar para a Loja
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-10">
            <div className="border-b bg-white sticky top-0 z-10 mb-8">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Finalizar Compra
                    </h1>
                    <p className="text-muted-foreground">
                        Confira seus itens e dados de entrega
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* AddressForm recebe deliveryInfo e a função handleInputChange */}
                        <AddressForm
                            deliveryInfo={deliveryInfo}
                            onChange={handleInputChange}
                        />
                        <PaymentSelector
                            selectedMethod={paymentMethod}
                            onSelect={setPaymentMethod}
                        />
                    </div>

                    <div className="lg:col-span-1">
                        <OrderSummary
                            cartItems={cartItems}
                            subtotal={subtotal}
                            shipping={shipping}
                            total={total}
                            paymentMethod={paymentMethod}
                            onFinish={handleFinishOrder}
                            isProcessing={isProcessing}
                            formatPrice={formatPrice}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}