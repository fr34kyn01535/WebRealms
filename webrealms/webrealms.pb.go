// Code generated by protoc-gen-go.
// source: webrealms.proto
// DO NOT EDIT!

/*
Package webrealms is a generated protocol buffer package.

It is generated from these files:
	webrealms.proto

It has these top-level messages:
	ProtocolMessage
*/
package webrealms

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion2 // please upgrade the proto package

type ProtocolMessage_MessageType int32

const (
	ProtocolMessage_NONE              ProtocolMessage_MessageType = 0
	ProtocolMessage_PING              ProtocolMessage_MessageType = 16
	ProtocolMessage_PONG              ProtocolMessage_MessageType = 17
	ProtocolMessage_HELLO             ProtocolMessage_MessageType = 18
	ProtocolMessage_BYE               ProtocolMessage_MessageType = 19
	ProtocolMessage_POSITION_ROTATION ProtocolMessage_MessageType = 21
)

var ProtocolMessage_MessageType_name = map[int32]string{
	0:  "NONE",
	16: "PING",
	17: "PONG",
	18: "HELLO",
	19: "BYE",
	21: "POSITION_ROTATION",
}
var ProtocolMessage_MessageType_value = map[string]int32{
	"NONE":              0,
	"PING":              16,
	"PONG":              17,
	"HELLO":             18,
	"BYE":               19,
	"POSITION_ROTATION": 21,
}

func (x ProtocolMessage_MessageType) String() string {
	return proto.EnumName(ProtocolMessage_MessageType_name, int32(x))
}
func (ProtocolMessage_MessageType) EnumDescriptor() ([]byte, []int) {
	return fileDescriptor0, []int{0, 0}
}

type ProtocolMessage struct {
	Type     ProtocolMessage_MessageType      `protobuf:"varint,1,opt,name=Type,json=type,enum=webrealms.ProtocolMessage_MessageType" json:"Type,omitempty"`
	Ping     *ProtocolMessage_PingMessage     `protobuf:"bytes,16,opt,name=Ping,json=ping" json:"Ping,omitempty"`
	Pong     *ProtocolMessage_PongMessage     `protobuf:"bytes,17,opt,name=Pong,json=pong" json:"Pong,omitempty"`
	Hello    *ProtocolMessage_HelloMessage    `protobuf:"bytes,18,opt,name=Hello,json=hello" json:"Hello,omitempty"`
	Bye      *ProtocolMessage_ByeMessage      `protobuf:"bytes,19,opt,name=Bye,json=bye" json:"Bye,omitempty"`
	Position *ProtocolMessage_PositionMessage `protobuf:"bytes,20,opt,name=Position,json=position" json:"Position,omitempty"`
	Rotation *ProtocolMessage_RotationMessage `protobuf:"bytes,21,opt,name=Rotation,json=rotation" json:"Rotation,omitempty"`
}

func (m *ProtocolMessage) Reset()                    { *m = ProtocolMessage{} }
func (m *ProtocolMessage) String() string            { return proto.CompactTextString(m) }
func (*ProtocolMessage) ProtoMessage()               {}
func (*ProtocolMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0} }

func (m *ProtocolMessage) GetType() ProtocolMessage_MessageType {
	if m != nil {
		return m.Type
	}
	return ProtocolMessage_NONE
}

func (m *ProtocolMessage) GetPing() *ProtocolMessage_PingMessage {
	if m != nil {
		return m.Ping
	}
	return nil
}

func (m *ProtocolMessage) GetPong() *ProtocolMessage_PongMessage {
	if m != nil {
		return m.Pong
	}
	return nil
}

func (m *ProtocolMessage) GetHello() *ProtocolMessage_HelloMessage {
	if m != nil {
		return m.Hello
	}
	return nil
}

func (m *ProtocolMessage) GetBye() *ProtocolMessage_ByeMessage {
	if m != nil {
		return m.Bye
	}
	return nil
}

func (m *ProtocolMessage) GetPosition() *ProtocolMessage_PositionMessage {
	if m != nil {
		return m.Position
	}
	return nil
}

func (m *ProtocolMessage) GetRotation() *ProtocolMessage_RotationMessage {
	if m != nil {
		return m.Rotation
	}
	return nil
}

type ProtocolMessage_PingMessage struct {
}

func (m *ProtocolMessage_PingMessage) Reset()                    { *m = ProtocolMessage_PingMessage{} }
func (m *ProtocolMessage_PingMessage) String() string            { return proto.CompactTextString(m) }
func (*ProtocolMessage_PingMessage) ProtoMessage()               {}
func (*ProtocolMessage_PingMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 0} }

type ProtocolMessage_PongMessage struct {
}

func (m *ProtocolMessage_PongMessage) Reset()                    { *m = ProtocolMessage_PongMessage{} }
func (m *ProtocolMessage_PongMessage) String() string            { return proto.CompactTextString(m) }
func (*ProtocolMessage_PongMessage) ProtoMessage()               {}
func (*ProtocolMessage_PongMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 1} }

type ProtocolMessage_HelloMessage struct {
	Id   []byte `protobuf:"bytes,1,opt,name=Id,json=id,proto3" json:"Id,omitempty"`
	Name string `protobuf:"bytes,2,opt,name=Name,json=name" json:"Name,omitempty"`
}

func (m *ProtocolMessage_HelloMessage) Reset()                    { *m = ProtocolMessage_HelloMessage{} }
func (m *ProtocolMessage_HelloMessage) String() string            { return proto.CompactTextString(m) }
func (*ProtocolMessage_HelloMessage) ProtoMessage()               {}
func (*ProtocolMessage_HelloMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 2} }

func (m *ProtocolMessage_HelloMessage) GetId() []byte {
	if m != nil {
		return m.Id
	}
	return nil
}

func (m *ProtocolMessage_HelloMessage) GetName() string {
	if m != nil {
		return m.Name
	}
	return ""
}

type ProtocolMessage_ByeMessage struct {
}

func (m *ProtocolMessage_ByeMessage) Reset()                    { *m = ProtocolMessage_ByeMessage{} }
func (m *ProtocolMessage_ByeMessage) String() string            { return proto.CompactTextString(m) }
func (*ProtocolMessage_ByeMessage) ProtoMessage()               {}
func (*ProtocolMessage_ByeMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 3} }

type ProtocolMessage_PositionMessage struct {
	X float32 `protobuf:"fixed32,1,opt,name=X,json=x" json:"X,omitempty"`
	Y float32 `protobuf:"fixed32,2,opt,name=Y,json=y" json:"Y,omitempty"`
	Z float32 `protobuf:"fixed32,3,opt,name=Z,json=z" json:"Z,omitempty"`
}

func (m *ProtocolMessage_PositionMessage) Reset()         { *m = ProtocolMessage_PositionMessage{} }
func (m *ProtocolMessage_PositionMessage) String() string { return proto.CompactTextString(m) }
func (*ProtocolMessage_PositionMessage) ProtoMessage()    {}
func (*ProtocolMessage_PositionMessage) Descriptor() ([]byte, []int) {
	return fileDescriptor0, []int{0, 4}
}

func (m *ProtocolMessage_PositionMessage) GetX() float32 {
	if m != nil {
		return m.X
	}
	return 0
}

func (m *ProtocolMessage_PositionMessage) GetY() float32 {
	if m != nil {
		return m.Y
	}
	return 0
}

func (m *ProtocolMessage_PositionMessage) GetZ() float32 {
	if m != nil {
		return m.Z
	}
	return 0
}

type ProtocolMessage_RotationMessage struct {
	X float32 `protobuf:"fixed32,1,opt,name=X,json=x" json:"X,omitempty"`
	Y float32 `protobuf:"fixed32,2,opt,name=Y,json=y" json:"Y,omitempty"`
	Z float32 `protobuf:"fixed32,3,opt,name=Z,json=z" json:"Z,omitempty"`
	W float32 `protobuf:"fixed32,4,opt,name=W,json=w" json:"W,omitempty"`
}

func (m *ProtocolMessage_RotationMessage) Reset()         { *m = ProtocolMessage_RotationMessage{} }
func (m *ProtocolMessage_RotationMessage) String() string { return proto.CompactTextString(m) }
func (*ProtocolMessage_RotationMessage) ProtoMessage()    {}
func (*ProtocolMessage_RotationMessage) Descriptor() ([]byte, []int) {
	return fileDescriptor0, []int{0, 5}
}

func (m *ProtocolMessage_RotationMessage) GetX() float32 {
	if m != nil {
		return m.X
	}
	return 0
}

func (m *ProtocolMessage_RotationMessage) GetY() float32 {
	if m != nil {
		return m.Y
	}
	return 0
}

func (m *ProtocolMessage_RotationMessage) GetZ() float32 {
	if m != nil {
		return m.Z
	}
	return 0
}

func (m *ProtocolMessage_RotationMessage) GetW() float32 {
	if m != nil {
		return m.W
	}
	return 0
}

func init() {
	proto.RegisterType((*ProtocolMessage)(nil), "webrealms.ProtocolMessage")
	proto.RegisterType((*ProtocolMessage_PingMessage)(nil), "webrealms.ProtocolMessage.PingMessage")
	proto.RegisterType((*ProtocolMessage_PongMessage)(nil), "webrealms.ProtocolMessage.PongMessage")
	proto.RegisterType((*ProtocolMessage_HelloMessage)(nil), "webrealms.ProtocolMessage.HelloMessage")
	proto.RegisterType((*ProtocolMessage_ByeMessage)(nil), "webrealms.ProtocolMessage.ByeMessage")
	proto.RegisterType((*ProtocolMessage_PositionMessage)(nil), "webrealms.ProtocolMessage.PositionMessage")
	proto.RegisterType((*ProtocolMessage_RotationMessage)(nil), "webrealms.ProtocolMessage.RotationMessage")
	proto.RegisterEnum("webrealms.ProtocolMessage_MessageType", ProtocolMessage_MessageType_name, ProtocolMessage_MessageType_value)
}

func init() { proto.RegisterFile("webrealms.proto", fileDescriptor0) }

var fileDescriptor0 = []byte{
	// 393 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0x8c, 0x93, 0x4f, 0x8b, 0xda, 0x40,
	0x18, 0xc6, 0x9b, 0x3f, 0x5a, 0x7d, 0x4d, 0xcd, 0x38, 0x56, 0x18, 0x72, 0x12, 0xa1, 0xad, 0xf4,
	0xe0, 0xc1, 0x1e, 0x0a, 0x2d, 0x3d, 0x54, 0xb0, 0x1a, 0xb0, 0x49, 0x98, 0x4a, 0x5b, 0x7b, 0x29,
	0x71, 0x1d, 0xb2, 0x81, 0x98, 0x09, 0x26, 0xe0, 0x66, 0xbf, 0xc3, 0x7e, 0xe7, 0x65, 0xc6, 0x44,
	0x83, 0x87, 0xb8, 0xa7, 0xbc, 0xcf, 0xc3, 0xf3, 0x7b, 0x98, 0x77, 0x92, 0x80, 0x79, 0x64, 0xdb,
	0x03, 0xf3, 0xa3, 0x7d, 0x3a, 0x49, 0x0e, 0x3c, 0xe3, 0xb8, 0x7d, 0x36, 0x46, 0x4f, 0x4d, 0x30,
	0x3d, 0x61, 0xde, 0xf1, 0xe8, 0x27, 0x4b, 0x53, 0x3f, 0x60, 0xf8, 0x0b, 0xe8, 0xeb, 0x3c, 0x61,
	0x44, 0x19, 0x2a, 0xe3, 0xee, 0xf4, 0xfd, 0xe4, 0x82, 0x5f, 0x25, 0x27, 0xc5, 0x53, 0xa4, 0xa9,
	0x9e, 0xe5, 0x89, 0x64, 0xbd, 0x30, 0x0e, 0x08, 0x1a, 0x2a, 0xe3, 0x4e, 0x2d, 0x2b, 0x62, 0xc5,
	0x4c, 0xf5, 0x24, 0x8c, 0x03, 0xc9, 0xf2, 0x38, 0x20, 0xbd, 0xdb, 0x2c, 0xaf, 0xb2, 0x3c, 0x0e,
	0xf0, 0x37, 0x68, 0x2c, 0x59, 0x14, 0x71, 0x82, 0x25, 0xfc, 0xa1, 0x06, 0x96, 0xb9, 0x92, 0x6e,
	0xdc, 0x0b, 0x85, 0x3f, 0x83, 0x36, 0xcb, 0x19, 0xe9, 0x4b, 0xf8, 0x5d, 0x0d, 0x3c, 0xcb, 0x59,
	0x89, 0x6a, 0xdb, 0x9c, 0xe1, 0x1f, 0xd0, 0xf2, 0x78, 0x1a, 0x66, 0x21, 0x8f, 0xc9, 0x5b, 0x49,
	0x7f, 0xac, 0x3d, 0xf7, 0x29, 0x5a, 0x56, 0xb4, 0x92, 0xc2, 0x10, 0x3d, 0x94, 0x67, 0xbe, 0xec,
	0x19, 0xdc, 0xec, 0x29, 0xa3, 0xe7, 0x9e, 0x43, 0x61, 0x58, 0x6f, 0xa0, 0x53, 0xb9, 0x58, 0x29,
	0x2f, 0x77, 0x65, 0x4d, 0xc1, 0xa8, 0x6e, 0x8f, 0xbb, 0xa0, 0xda, 0x3b, 0xf9, 0x9e, 0x0d, 0xaa,
	0x86, 0x3b, 0x8c, 0x41, 0x77, 0xfc, 0x3d, 0x23, 0xea, 0x50, 0x19, 0xb7, 0xa9, 0x1e, 0xfb, 0x7b,
	0x66, 0x19, 0x00, 0x97, 0xa5, 0xad, 0xaf, 0x60, 0x5e, 0x2d, 0x81, 0x0d, 0x50, 0xfe, 0xca, 0x0e,
	0x95, 0x2a, 0x0f, 0x42, 0x6d, 0x24, 0xaf, 0x52, 0x25, 0x17, 0xea, 0x1f, 0xd1, 0x4e, 0xea, 0xd1,
	0xb2, 0xc1, 0xbc, 0x3a, 0xf9, 0xcb, 0x61, 0xa1, 0xfe, 0x10, 0xfd, 0xa4, 0x8e, 0xa3, 0xdf, 0xd0,
	0xa9, 0x7c, 0x7c, 0xb8, 0x05, 0xba, 0xe3, 0x3a, 0x73, 0xf4, 0x4a, 0x4c, 0x9e, 0xed, 0x2c, 0x10,
	0x92, 0x93, 0xeb, 0x2c, 0x50, 0x0f, 0xb7, 0xa1, 0xb1, 0x9c, 0xaf, 0x56, 0x2e, 0xc2, 0xf8, 0x35,
	0x68, 0xb3, 0xcd, 0x1c, 0xf5, 0xf1, 0x00, 0x7a, 0x9e, 0xfb, 0xcb, 0x5e, 0xdb, 0xae, 0xf3, 0x9f,
	0xba, 0xeb, 0xef, 0x62, 0x40, 0x83, 0x6d, 0x53, 0xfe, 0x21, 0x9f, 0x9e, 0x03, 0x00, 0x00, 0xff,
	0xff, 0xfd, 0xb3, 0x17, 0xfc, 0x34, 0x03, 0x00, 0x00,
}